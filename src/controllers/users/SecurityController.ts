import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import User from "~/models/User";
import Session from "~/models/Session";
import {
  NotFoundError,
  ValidationError,
  ServerError,
  AuthenticationError,
} from "~/utils/errors";

// Extended User interface for security features
interface UserWithSecurity {
  _id: string;
  email: string;
  password?: string;
  sessionVersion?: number;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  tempTwoFactorSecret?: string;
  biometricEnabled?: boolean;
  passwordChangedAt?: Date;
  createdAt: Date;
}

export default class SecurityController {
  /**
   * Change user password
   * @throws {ValidationError} When password validation fails
   * @throws {AuthenticationError} When current password is incorrect
   * @throws {NotFoundError} When user is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async changePassword({
    userId,
    currentPassword,
    newPassword,
    currentToken,
  }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    currentToken: string;
  }) {
    try {
      // Validation
      if (!currentPassword || !newPassword) {
        throw new ValidationError(
          "Current password and new password are required",
          "password"
        );
      }

      if (newPassword.length < 8) {
        throw new ValidationError(
          "New password must be at least 8 characters long",
          "newPassword"
        );
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(newPassword)) {
        throw new ValidationError(
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
          "newPassword"
        );
      }

      // Get user from database
      const user = (await User.findById(userId).select(
        "+password"
      )) as UserWithSecurity | null;

      if (!user) {
        throw new NotFoundError("User", userId);
      }
      console.log({ currentPassword, password: user.password });

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password || ""
      );
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError("Current password is incorrect");
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(
        newPassword,
        user.password || ""
      );
      if (isSamePassword) {
        throw new ValidationError(
          "New password must be different from current password",
          "newPassword"
        );
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword,
        passwordChangedAt: new Date(),
        // Invalidate all sessions except current one
        sessionVersion: user.sessionVersion + 1,
      });

      // Update current session to maintain login
      await Session.findOneAndUpdate(
        { userId, token: currentToken },
        { sessionVersion: user.sessionVersion + 1 }
      );

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (
        err instanceof ValidationError ||
        err instanceof AuthenticationError ||
        err instanceof NotFoundError
      ) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    }
  }

  /**
   * Setup Two-Factor Authentication
   * @throws {NotFoundError} When user is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async setupTwoFactor({ userId }: { userId: string }) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User", userId);
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `PM Trippers (${user.email})`,
        issuer: "PM Trippers",
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      // Store temp secret (not activated yet)
      await User.findByIdAndUpdate(userId, {
        tempTwoFactorSecret: secret.base32,
      });

      return {
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          manualEntryKey: secret.base32,
        },
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error
          ? err.message
          : "Failed to setup two-factor authentication"
      );
    }
  }

  /**
   * Verify and Enable Two-Factor Authentication
   * @throws {ValidationError} When token validation fails
   * @throws {NotFoundError} When user is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async enableTwoFactor({ userId, token }: { userId: string; token: string }) {
    try {
      if (!token || token.length !== 6) {
        throw new ValidationError(
          "Valid 6-digit verification token is required",
          "token"
        );
      }

      const user = await User.findById(userId);
      if (!user || !user.tempTwoFactorSecret) {
        throw new ValidationError("Two-factor setup not initiated", "setup");
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: user.tempTwoFactorSecret,
        encoding: "base32",
        token: token,
        window: 2,
      });

      if (!verified) {
        throw new ValidationError("Invalid verification token", "token");
      }

      // Enable 2FA
      await User.findByIdAndUpdate(userId, {
        twoFactorSecret: user.tempTwoFactorSecret,
        twoFactorEnabled: true,
        tempTwoFactorSecret: undefined,
      });

      return {
        success: true,
        message: "Two-factor authentication enabled successfully",
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof ValidationError || err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error
          ? err.message
          : "Failed to enable two-factor authentication"
      );
    }
  }

  /**
   * Disable Two-Factor Authentication
   * @throws {ValidationError} When validation fails
   * @throws {AuthenticationError} When password is incorrect
   * @throws {NotFoundError} When user is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async disableTwoFactor({
    userId,
    token,
    password,
  }: {
    userId: string;
    token: string;
    password: string;
  }) {
    try {
      if (!token || !password) {
        throw new ValidationError(
          "Verification token and password are required",
          "credentials"
        );
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User", userId);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid password");
      }

      // Verify 2FA token
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: "base32",
          token: token,
          window: 2,
        });

        if (!verified) {
          throw new ValidationError("Invalid verification token", "token");
        }
      }

      // Disable 2FA
      await User.findByIdAndUpdate(userId, {
        twoFactorSecret: undefined,
        twoFactorEnabled: false,
        tempTwoFactorSecret: undefined,
      });

      return {
        success: true,
        message: "Two-factor authentication disabled successfully",
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (
        err instanceof ValidationError ||
        err instanceof AuthenticationError ||
        err instanceof NotFoundError
      ) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error
          ? err.message
          : "Failed to disable two-factor authentication"
      );
    }
  }

  /**
   * Get Active Sessions
   * @throws {ServerError} When an unexpected error occurs
   */
  async getActiveSessions({
    userId,
    currentToken,
  }: {
    userId: string;
    currentToken: string;
  }) {
    try {
      const sessions = await Session.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      }).sort({ lastActivity: -1 });

      const sessionData = sessions.map((session) => ({
        id: session._id,
        deviceInfo: session.deviceInfo,
        location: session.location,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isCurrentSession: session.token === currentToken,
      }));

      return {
        success: true,
        data: sessionData,
      };
    } catch (err: unknown) {
      // Convert errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to fetch active sessions"
      );
    }
  }

  /**
   * Terminate Session
   * @throws {ValidationError} When trying to terminate current session
   * @throws {NotFoundError} When session is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async terminateSession({
    sessionId,
    userId,
    currentToken,
  }: {
    sessionId: string;
    userId: string;
    currentToken: string;
  }) {
    try {
      const session = await Session.findOne({
        _id: sessionId,
        userId,
      });

      if (!session) {
        throw new NotFoundError("Session", sessionId);
      }

      // Don't allow terminating current session
      if (session.token === currentToken) {
        throw new ValidationError(
          "Cannot terminate current session",
          "session"
        );
      }

      await session.terminate();

      return {
        success: true,
        message: "Session terminated successfully",
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof ValidationError || err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to terminate session"
      );
    }
  }

  /**
   * Logout All Devices
   * @throws {ValidationError} When password is missing
   * @throws {AuthenticationError} When password is incorrect
   * @throws {NotFoundError} When user is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async logoutAllDevices({
    userId,
    password,
    currentToken,
  }: {
    userId: string;
    password: string;
    currentToken: string;
  }) {
    try {
      if (!password) {
        throw new ValidationError("Password is required", "password");
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User", userId);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid password");
      }

      // Deactivate all sessions
      await Session.updateMany(
        { userId, isActive: true },
        {
          isActive: false,
          terminatedAt: new Date(),
        }
      );

      // Update session version to invalidate all tokens
      await User.findByIdAndUpdate(userId, {
        sessionVersion: user.sessionVersion + 1,
      });

      return {
        success: true,
        message: "Logged out from all devices successfully",
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (
        err instanceof ValidationError ||
        err instanceof AuthenticationError ||
        err instanceof NotFoundError
      ) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to logout from all devices"
      );
    }
  }

  /**
   * Get Security Overview
   * @throws {NotFoundError} When user is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async getSecurityOverview({ userId }: { userId: string }) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User", userId);
      }

      const activeSessions = await Session.countDocuments({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      const lastPasswordChange = user.passwordChangedAt || user.createdAt;
      const daysSincePasswordChange = Math.floor(
        (new Date().getTime() - lastPasswordChange.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      return {
        success: true,
        data: {
          twoFactorEnabled: user.twoFactorEnabled || false,
          biometricEnabled: user.biometricEnabled || false,
          activeSessions,
          lastPasswordChange,
          daysSincePasswordChange,
          accountCreated: user.createdAt,
        },
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to fetch security overview"
      );
    }
  }

  /**
   * Toggle Biometric Authentication
   * @throws {NotFoundError} When user is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async toggleBiometric({
    userId,
    enabled,
  }: {
    userId: string;
    enabled: boolean;
  }) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { biometricEnabled: enabled },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError("User", userId);
      }

      return {
        success: true,
        message: `Biometric authentication ${
          enabled ? "enabled" : "disabled"
        } successfully`,
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error
          ? err.message
          : "Failed to toggle biometric authentication"
      );
    }
  }
}
