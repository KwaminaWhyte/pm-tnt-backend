import User from "~/models/User";
import bcrypt from "bcryptjs";
import { UserSearchParams, UpdateUserDTO } from "~/utils/types";
import { error, type Context } from "elysia";

export default class UserController {
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
        message: "User profile retrieved successfully",
        data: user,
      };
    } catch (e: any) {
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
   * Create new user
   * @throws {Error} 400 - Validation error or duplicate user
   */
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password?: string;
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
    console.log(updateData, id);

    try {
      const user = await User.findById(id);
      if (!user) {
        throw error(404, {
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
        data: updatedUser,
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
}
