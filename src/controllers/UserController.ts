import User from "../models/User";
import generateOTP from "../utils/generateOtp";
import sendSMS from "../utils/sendSMS";
import bcrypt from "bcryptjs";
import {
  LoginWithEmailDTO,
  LoginWithPhoneDTO,
  VerifyOtpDTO,
  UserSearchParams,
  UpdateUserDTO,
  RegisterDTO,
} from "../utils/types";
import { error } from "elysia";

export default class UserController {
  /**
   * Register a new user
   * @throws {Error} 400 - Invalid input data
   *
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      phone,
      email,
      password: hashedPassword,
    });
    await user.save();

    return user;
  }

  /**
   * Authenticate user with email and password
   * @throws {Error} 401 - Invalid credentials
   * @throws {Error} 400 - Invalid input data
   */
  async loginWithEmail(data: LoginWithEmailDTO, jwt_auth?: any) {
    const { email, password } = data;

    if (!email || !password) {
      return error(404, {
        message: "Invalid input data",
        errors: [
          {
            type: "ValidationError",
            message: "Email and password are required",
          },
        ],
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return error(404, {
        message: "User not found",
        errors: [
          {
            type: "AuthenticationError",
            message: "Invalid credentials",
          },
        ],
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return error(404, {
        message: "Invalid credentials",
        errors: [
          {
            type: "AuthenticationError",
            message: "Incorrect password",
          },
        ],
      });
    }

    // Optional: Generate JWT token if jwt_auth is provided
    let token = null;
    if (jwt_auth) {
      token = await jwt_auth.sign({
        id: user.id,
        email: user.email,
      });
    }

    return {
      user,
      token,
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
      return error(404, {
        message: "Invalid input data",
        errors: [
          {
            type: "ValidationError",
            path: ["phone"],
            message: "Phone number is required",
          },
        ],
      });
    }

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

    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await User.updateOne(
      { _id: user._id },
      {
        otp: {
          code: otp,
          expiresAt,
        },
      }
    );

    try {
      await sendSMS({
        smsText: `Your verification code is ${otp} - PMTnT`,
        recipient: phone,
      });
      return {
        message: "OTP sent successfully",
      };
    } catch (error) {
      return error(500, {
        message: "SMS service error",
        errors: [
          {
            type: "ServiceError",
            path: ["sms"],
            message: "Failed to send OTP",
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
      return error(404, {
        message: "Invalid input data",
        errors: [
          {
            type: "ValidationError",
            path: ["phone", "otp"],
            message: "Phone and OTP are required",
          },
        ],
      });
    }

    const user = await User.findOne({
      phone,
      "otp.code": otp,
      "otp.expiresAt": { $gt: new Date() },
    });

    if (!user) {
      return error(401, {
        message: "Authentication failed",
        errors: [
          {
            type: "AuthenticationError",
            path: ["otp"],
            message: "Invalid or expired OTP",
          },
        ],
      });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $unset: { otp: "" },
        isPhoneVerified: true,
      }
    );

    const token = await jwt_auth.sign({ id: user.id });
    const userData = await User.findById(user.id).select("-password -otp");

    return {
      token,
      user: userData,
    };
  }

  /**
   * Get user by ID
   * @throws {Error} 404 - User not found
   */
  async getUser(userId: string) {
    try {
      const user = await User.findById(userId).select("-password -otp");

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

      return {
        user,
      };
    } catch (e) {
      if (e instanceof Error && e.message.includes("User not found")) {
        throw e;
      }
      return error(400, {
        message: "Invalid user ID",
        errors: [
          {
            type: "ValidationError",
            path: ["userId"],
            message: "Invalid user ID format",
          },
        ],
      });
    }
  }

  /**
   * Get user by ID
   * @throws {Error} 404 - User not found
   */
  async getUserById(id: string) {
    try {
      const user = await User.findById(id).select("-password -otp");

      if (!user) {
        return error(404, {
          message: "User not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "User not found",
            },
          ],
        });
      }

      return { user };
    } catch (error) {
      if (error instanceof Error && error.message.includes("User not found")) {
        throw error;
      }
      return error(400, {
        message: "Invalid user ID",
        errors: [
          {
            type: "ValidationError",
            path: ["id"],
            message: "Invalid user ID format",
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
    if (!currentPassword || !newPassword) {
      return error(400, {
        message: "Invalid input data",
        errors: [
          {
            type: "ValidationError",
            path: ["currentPassword", "newPassword"],
            message: "Current password and new password are required",
          },
        ],
      });
    }

    const user = await User.findById(userId);
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

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password || ""
    );
    if (!isValidPassword) {
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
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    return {
      message: "Password changed successfully",
    };
  }

  /**
   * Create new user
   * @throws {Error} 400 - Validation error or duplicate user
   */
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password?: string;
    position?: string;
  }) {
    const errors = [];

    // Validate required fields
    if (!userData.firstName || !userData.phone) {
      return error(400, {
        message: "Missing required fields",
        errors: [
          {
            type: "ValidationError",
            path: ["firstName", "phone"],
            message: "First name and phone are required",
          },
        ],
      });
    }

    // Check for existing users
    if (userData.phone) {
      const phoneExists = await User.findOne({ phone: userData.phone });
      if (phoneExists) {
        errors.push({
          type: "DuplicateError",
          path: ["phone"],
          message: "Phone number already in use",
        });
      }
    }

    if (userData.email) {
      const emailExists = await User.findOne({ email: userData.email });
      if (emailExists) {
        errors.push({
          type: "DuplicateError",
          path: ["email"],
          message: "Email already in use",
        });
      }
    }

    if (errors.length > 0) {
      return error(400, {
        message: "Validation error",
        errors,
      });
    }

    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const user = await User.create(userData);
    const userResponse = await User.findById(user._id).select("-password -otp");

    return {
      message: "User created successfully",
      user: userResponse,
    };
  }

  /**
   * Get users with pagination and search
   * @throws {Error} 400 - Invalid search parameters
   */
  async getUsers({
    page = 1,
    searchTerm,
    limit = 10,
    status,
  }: UserSearchParams) {
    try {
      if (page < 1 || limit < 1) {
        return error(400, {
          message: "Invalid pagination parameters",
          errors: [
            {
              type: "ValidationError",
              path: ["page", "limit"],
              message: "Page and limit must be positive numbers",
            },
          ],
        });
      }

      const searchFilter = searchTerm
        ? {
            $or: [
              { firstName: { $regex: searchTerm, $options: "i" } },
              { lastName: { $regex: searchTerm, $options: "i" } },
              { email: { $regex: searchTerm, $options: "i" } },
              { phone: { $regex: searchTerm, $options: "i" } },
            ],
          }
        : {};

      const filters = {
        ...searchFilter,
        ...(status && { status }),
      };

      const [users, totalCount] = await Promise.all([
        User.find(filters)
          .select("-password -otp")
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 }),
        User.countDocuments(filters),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      if (page > totalPages && totalCount > 0) {
        return error(400, {
          message: "Page number exceeds available pages",
          errors: [
            {
              type: "ValidationError",
              path: ["page"],
              message: `Page should be between 1 and ${totalPages}`,
            },
          ],
        });
      }

      return {
        success: true,
        data: users,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to retrieve users",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message: "An error occurred while fetching users",
            },
          ],
        })
      );
    }
  }

  /**
   * Delete user (soft delete)
   * @throws {Error} 404 - User not found
   */
  async deleteUser(id: string) {
    try {
      const user = await User.findById(id);

      if (!user) {
        throw new Error(
          JSON.stringify({
            message: "User not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "User not found",
              },
            ],
          })
        );
      }

      await User.findByIdAndUpdate(id, {
        status: "inactive",
        updatedAt: new Date(),
      });

      return {
        message: "User deleted successfully",
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to delete user",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message: "An error occurred while deleting user",
            },
          ],
        })
      );
    }
  }

  /**
   * Update user profile
   * @throws {Error} 404 - User not found
   * @throws {Error} 400 - Validation error or duplicate data
   */
  async updateUserProfile(id: string, updateData: UpdateUserDTO) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error(
          JSON.stringify({
            message: "User not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "User not found",
              },
            ],
          })
        );
      }

      const errors = [];

      // Check for unique fields if they are being updated
      if (updateData.phone && updateData.phone !== user.phone) {
        const phoneExists = await User.findOne({
          phone: updateData.phone,
          _id: { $ne: id },
        });
        if (phoneExists) {
          errors.push({
            type: "DuplicateError",
            path: ["phone"],
            message: "Phone number already in use",
          });
        }
      }

      if (updateData.email && updateData.email !== user.email) {
        const emailExists = await User.findOne({
          email: updateData.email,
          _id: { $ne: id },
        });
        if (emailExists) {
          errors.push({
            type: "DuplicateError",
            path: ["email"],
            message: "Email already in use",
          });
        }
      }

      if (errors.length > 0) {
        throw new Error(
          JSON.stringify({
            message: "Validation failed",
            errors,
          })
        );
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).select("-password -otp");

      return {
        message: "User updated successfully",
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to update user",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message: "An error occurred while updating user",
            },
          ],
        })
      );
    }
  }

  /**
   * Remove duplicate user records
   * @throws {Error} 500 - Server error
   */
  async removeDuplicates() {
    try {
      const duplicates = await User.aggregate([
        {
          $group: {
            _id: {
              firstName: "$firstName",
              lastName: "$lastName",
              phone: "$phone",
            },
            uniqueIds: { $addToSet: "$_id" },
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ]);

      let removedCount = 0;
      for (const duplicate of duplicates) {
        const [keepId, ...removeIds] = duplicate.uniqueIds;
        await User.deleteMany({ _id: { $in: removeIds } });
        removedCount += removeIds.length;
      }

      return {
        message: "Duplicate removal completed",
        statistics: {
          duplicateGroups: duplicates.length,
          removedUsers: removedCount,
        },
      };
    } catch (error) {
      throw new Error(
        JSON.stringify({
          message: "Failed to remove duplicates",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message: "An error occurred while removing duplicate users",
            },
          ],
        })
      );
    }
  }

  /**
   * Update user profile
   * @throws {Error} 404 - User not found
   * @throws {Error} 400 - Validation error or duplicate data
   */
  async updateUser(id: string, updateData: UpdateUserDTO) {
    const user = await User.findById(id);

    if (!user) {
      throw new Error(
        JSON.stringify({
          message: "User not found",
        })
      );
    }

    const errors = [];

    if (updateData.phone && updateData.phone !== user.phone) {
      const phoneExists = await User.findOne({
        phone: updateData.phone,
        _id: { $ne: id },
      });
      if (phoneExists) {
        errors.push({
          type: "DuplicateError",
          path: ["phone"],
          message: "Phone number already in use",
        });
      }
    }

    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await User.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });
      if (emailExists) {
        errors.push({
          type: "DuplicateError",
          path: ["email"],
          message: "Email already in use",
        });
      }
    }

    if (errors.length > 0) {
      throw new Error(JSON.stringify({ message: "Validation failed", errors }));
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).select("-password -otp");

    return {
      message: "User updated successfully",
      user: updatedUser,
    };
  }
}
