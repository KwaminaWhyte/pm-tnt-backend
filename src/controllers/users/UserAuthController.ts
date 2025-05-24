import User from "~/models/User";
import Email from "~/models/Email";
import generateOTP from "~/utils/generateOtp";
import sendSMS from "~/utils/sendSMS";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  LoginWithEmailDTO,
  LoginWithPhoneDTO,
  VerifyOtpDTO,
  RegisterDTO,
} from "~/utils/types";
import { error } from "elysia";

export default class UserAuthController {
  /**
   * Register a new user
   * @throws {Error} 400 - Invalid input data
   */
  async register(data: RegisterDTO) {
    const { email, password, firstName, lastName, phone } = data;

    if (!email || !password) {
      return error(404, {
        message: "Invalid input data",
        errors: [
          {
            type: "ValidationError",
            path: ["email", "password"],
            message: "Email and password are required",
          },
        ],
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error(404, {
        message: "Email already exists",
        errors: [
          {
            type: "ValidationError",
            path: ["email"],
            message: "An account with this email already exists",
          },
        ],
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return error(404, {
        message: "Phone already exists",
        errors: [
          {
            type: "ValidationError",
            path: ["phone"],
            message: "An account with this phone number already exists",
          },
        ],
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token valid for 24 hours

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      phone,
      email,
      password: hashedPassword,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: tokenExpiry,
    });
    await user.save();

    // Create verification email
    const verificationUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/verify-email?token=${verificationToken}&email=${email}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to PM Travel and Tour!</h2>
        <p>Hello ${firstName},</p>
        <p>Thank you for registering with PM Travel and Tour. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Best regards,<br>PM Travel and Tour Team</p>
      </div>
    `;

    // Create email record for the cron job to pick up
    const emailRecord = new Email({
      email: user.email,
      subject: "Verify Your Email - PM Travel and Tour",
      body: emailBody,
      isSent: false,
    });
    await emailRecord.save();

    return {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
      message:
        "Registration successful. Please check your email to verify your account.",
    };
  }

  /**
   * Authenticate user with email and password
   * @throws {Error} 401 - Invalid credentials
   * @throws {Error} 400 - Invalid input data
   * @throws {Error} 403 - Email not verified
   */
  async loginWithEmail(data: LoginWithEmailDTO, jwt_auth?: any) {
    const { email, password } = data;

    if (!email || !password) {
      return error(400, {
        message: "Invalid input data",
        errors: [
          {
            type: "ValidationError",
            path: ["email", "password"],
            message: "Email and password are required",
          },
        ],
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return error(401, {
        message: "Invalid credentials",
        errors: [
          {
            type: "AuthenticationError",
            path: ["email", "password"],
            message: "Invalid email or password",
          },
        ],
      });
    }

    if (!user.password) {
      return error(401, {
        message: "Invalid credentials",
        errors: [
          {
            type: "AuthenticationError",
            path: ["email", "password"],
            message: "Invalid email or password",
          },
        ],
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return error(401, {
        message: "Invalid credentials",
        errors: [
          {
            type: "AuthenticationError",
            path: ["email", "password"],
            message: "Invalid email or password",
          },
        ],
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return error(403, {
        message: "Email not verified",
        errors: [
          {
            type: "AuthenticationError",
            path: ["email"],
            message: "Please verify your email before logging in",
          },
        ],
      });
    }

    // Generate JWT
    const token = await jwt_auth?.sign({
      userId: user._id,
      role: user.role,
    });

    return {
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    };
  }

  /**
   * Request OTP for phone authentication
   * @throws {Error} 404 - User not found
   * @throws {Error} 400 - Invalid phone number
   * @throws {Error} 500 - SMS service error
   */
  async requestOTP(phone: string) {
    if (!phone) {
      return error(400, {
        message: "Invalid phone number",
        errors: [
          {
            type: "ValidationError",
            path: ["phone"],
            message: "Phone number is required",
          },
        ],
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phone });

    if (!user) {
      return error(404, {
        message: "User not found",
        errors: [
          {
            type: "NotFoundError",
            path: ["phone"],
            message: "No account found with this phone number",
          },
        ],
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Save OTP to user record
    user.phoneOtp = otp;
    user.phoneOtpExpires = otpExpiry;
    await user.save();

    // Send OTP via SMS
    try {
      await sendSMS(
        phone,
        `Your PM Travel and Tour verification code is: ${otp}. Valid for 10 minutes.`
      );

      return {
        message: "OTP sent successfully",
        expiresIn: "10 minutes",
      };
    } catch (err) {
      return error(500, {
        message: "Failed to send OTP",
        errors: [
          {
            type: "ServerError",
            message: "Could not send SMS. Please try again later.",
          },
        ],
      });
    }
  }

  /**
   * Verify OTP and complete phone authentication
   * @throws {Error} 401 - Invalid or expired OTP
   * @throws {Error} 404 - User not found
   */
  async verifyOtp(data: VerifyOtpDTO, jwt_auth?: any) {
    const { phone, otp } = data;

    if (!phone || !otp) {
      return error(400, {
        message: "Invalid input data",
        errors: [
          {
            type: "ValidationError",
            path: ["phone", "otp"],
            message: "Phone number and OTP are required",
          },
        ],
      });
    }

    // Find user by phone number
    const user = await User.findOne({
      phone,
      phoneOtp: otp,
      phoneOtpExpires: { $gt: new Date() },
    });

    if (!user) {
      return error(401, {
        message: "Invalid or expired OTP",
        errors: [
          {
            type: "AuthenticationError",
            path: ["otp"],
            message: "The OTP is invalid or has expired",
          },
        ],
      });
    }

    // Mark phone as verified and clear OTP
    user.isPhoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    await user.save();

    // Generate JWT
    const token = jwt_auth?.sign({
      userId: user._id,
      role: user.role,
    });

    return {
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    };
  }

  /**
   * Verify user email with verification token
   * @throws {Error} 400 - Invalid or expired token
   * @throws {Error} 404 - User not found
   */
  async verifyEmail(token: string, email: string) {
    try {
      const user = await User.findOne({
        email,
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
      });

      if (!user) {
        return error(400, {
          message: "Invalid or expired verification token",
          errors: [
            {
              type: "ValidationError",
              path: ["token"],
              message: "The verification link is invalid or has expired",
            },
          ],
        });
      }

      // Update user as verified
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      return {
        message: "Email verified successfully",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        },
      };
    } catch (err) {
      return error(500, {
        message: "Server error",
        errors: [
          {
            type: "ServerError",
            message: "An error occurred while verifying email",
          },
        ],
      });
    }
  }

  /**
   * Resend verification email
   * @throws {Error} 404 - User not found
   */
  async resendVerificationEmail(email: string) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return error(404, {
          message: "User not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["email"],
              message: "No account found with this email address",
            },
          ],
        });
      }

      if (user.isEmailVerified) {
        return {
          message: "Email is already verified",
        };
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = tokenExpiry;
      await user.save();

      // Create verification email
      const verificationUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/verify-email?token=${verificationToken}&email=${email}`;

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello ${user.firstName},</p>
          <p>You requested a new verification email. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not request this email, please ignore it.</p>
          <p>Best regards,<br>PM Travel and Tour Team</p>
        </div>
      `;

      // Create email record for the cron job to pick up
      const emailRecord = new Email({
        email: user.email,
        subject: "Verify Your Email - PM Travel and Tour",
        body: emailBody,
        isSent: false,
      });
      await emailRecord.save();

      return {
        message: "Verification email sent. Please check your inbox.",
      };
    } catch (err) {
      return error(500, {
        message: "Server error",
        errors: [
          {
            type: "ServerError",
            message: "An error occurred while sending verification email",
          },
        ],
      });
    }
  }

  /**
   * Change user password
   * @throws {Error} 400 - Invalid input data
   * @throws {Error} 401 - Invalid current password
   * @throws {Error} 404 - User not found
   */
  async changePassword({
    userId,
    currentPassword,
    newPassword,
  }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    if (!userId || !currentPassword || !newPassword) {
      return error(400, {
        message: "Invalid input data",
        errors: [
          {
            type: "ValidationError",
            path: ["userId", "currentPassword", "newPassword"],
            message: "All fields are required",
          },
        ],
      });
    }

    if (currentPassword === newPassword) {
      return error(400, {
        message: "New password must be different",
        errors: [
          {
            type: "ValidationError",
            path: ["newPassword"],
            message: "New password must be different from current password",
          },
        ],
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return error(404, {
        message: "User not found",
        errors: [
          {
            type: "NotFoundError",
            path: ["userId"],
            message: "User not found",
          },
        ],
      });
    }

    if (!user.password) {
      return error(400, {
        message: "Cannot change password",
        errors: [
          {
            type: "ValidationError",
            path: ["password"],
            message: "User does not have a password set",
          },
        ],
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return error(401, {
        message: "Invalid current password",
        errors: [
          {
            type: "AuthenticationError",
            path: ["currentPassword"],
            message: "Current password is incorrect",
          },
        ],
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return {
      message: "Password changed successfully",
    };
  }
}
