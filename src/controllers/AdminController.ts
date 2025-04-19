import bcrypt from "bcryptjs";
import Admin, { AdminInterface } from "../models/Admin";
import { error } from "elysia";

interface CreateAdminDTO {
  fullName: string;
  email: string;
  password: string;
  role?: string;
}

interface UpdateAdminDTO {
  fullName?: string;
  email?: string;
  role?: string;
}

interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export default class AdminController {
  /**
   * Login admin
   * @param param0
   * @returns
   */
  public async login(
    { email, password }: { email: string; password: string },
    jwt_auth: any
  ) {
    const admin = await Admin.findOne({
      email,
    });

    if (!admin) {
      return error(404, {
        message: "Admin not found",
        errors: [
          {
            type: "NotFoundError",
            path: ["email"],
            message: "Admin not found",
          },
        ],
      });
    }

    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      return error(401, {
        message: "Invalid Credentials",
        errors: [
          {
            type: "ValidationError",
            path: ["password"],
            message: "Invalid Credentials",
          },
        ],
      });
    }

    // const token = await this.generateToken(admin._id);

    const token = await jwt_auth.sign({ id: admin.id });
    const userData = await Admin.findById(admin.id).select("-password -otp");

    return {
      token,
      user: userData,
    };
  }

  /**
   * Get all admins with pagination and search
   */
  async getAdmins({
    page = 1,
    limit = 10,
    searchTerm,
  }: {
    page?: number;
    limit?: number;
    searchTerm?: string;
  }) {
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

      const filter: Record<string, any> = {};
      if (searchTerm) {
        filter.$or = [
          { fullName: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
        ];
      }

      const [admins, totalCount] = await Promise.all([
        Admin.find(filter)
          .select("-password")
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Admin.countDocuments(filter),
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
        data: admins,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (err) {
      return error(500, {
        message: "Failed to retrieve admins",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Get admin by ID
   * @throws {Error} 404 - Admin not found
   */
  async getAdmin(id: string) {
    try {
      const user = await Admin.findById(id).select("-password");

      if (!user) {
        return error(404, {
          message: "Admin not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Admin not found",
            },
          ],
        });
      }

      return { user };
    } catch (err) {
      return error(500, {
        message: "Failed to retrieve admin",
        errors: [
          {
            type: "ServerError",
            path: ["id"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Create new admin
   * @throws {Error} 400 - Validation error
   */
  async createAdmin(data: CreateAdminDTO) {
    try {
      const existingAdmin = await Admin.findOne({ email: data.email });
      if (existingAdmin) {
        return error(400, {
          message: "Email already exists",
          errors: [
            {
              type: "ValidationError",
              path: ["email"],
              message: "An admin with this email already exists",
            },
          ],
        });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const admin = new Admin({
        ...data,
        password: hashedPassword,
      });

      const savedAdmin = await admin.save();
      const { password, ...adminWithoutPassword } = savedAdmin.toObject();

      return {
        message: "Admin created successfully",
        admin: adminWithoutPassword,
      };
    } catch (err) {
      return error(500, {
        message: "Failed to create admin",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Update admin
   * @throws {Error} 404 - Admin not found
   * @throws {Error} 400 - Validation error
   */
  async updateAdmin(id: string, data: UpdateAdminDTO) {
    try {
      if (data.email) {
        const existingAdmin = await Admin.findOne({
          email: data.email,
          _id: { $ne: id },
        });
        if (existingAdmin) {
          return error(400, {
            message: "Email already exists",
            errors: [
              {
                type: "ValidationError",
                path: ["email"],
                message: "An admin with this email already exists",
              },
            ],
          });
        }
      }

      const admin = await Admin.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true }
      ).select("-password");

      if (!admin) {
        return error(404, {
          message: "Admin not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Admin not found",
            },
          ],
        });
      }

      return {
        message: "Admin updated successfully",
        admin,
      };
    } catch (err) {
      return error(500, {
        message: "Failed to update admin",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Delete admin
   * @throws {Error} 404 - Admin not found
   */
  async deleteAdmin(id: string) {
    try {
      const admin = await Admin.findByIdAndDelete(id);

      if (!admin) {
        return error(404, {
          message: "Admin not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Admin not found",
            },
          ],
        });
      }

      return {
        message: "Admin deleted successfully",
      };
    } catch (err) {
      return error(500, {
        message: "Failed to delete admin",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Change admin password
   * @throws {Error} 404 - Admin not found
   * @throws {Error} 400 - Invalid current password
   */
  async changePassword(id: string, data: ChangePasswordDTO) {
    try {
      const admin = await Admin.findById(id);

      if (!admin) {
        return error(404, {
          message: "Admin not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Admin not found",
            },
          ],
        });
      }

      const isValidPassword = await bcrypt.compare(
        data.currentPassword,
        admin.password
      );

      if (!isValidPassword) {
        return error(400, {
          message: "Invalid current password",
          errors: [
            {
              type: "ValidationError",
              path: ["currentPassword"],
              message: "Current password is incorrect",
            },
          ],
        });
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await Admin.findByIdAndUpdate(id, {
        password: hashedPassword,
      });

      return {
        message: "Password changed successfully",
      };
    } catch (err) {
      return error(500, {
        message: "Failed to change password",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Reset admin password (super admin only)
   * @param id
   * @param data { password: string }
   */
  async resetPassword(id: string, data: { password: string }) {
    try {
      const admin = await Admin.findById(id);
      if (!admin) {
        return error(404, {
          message: "Admin not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Admin not found",
            },
          ],
        });
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      await Admin.findByIdAndUpdate(id, {
        password: hashedPassword,
      });
      return {
        message: "Password reset successfully",
      };
    } catch (err) {
      return error(500, {
        message: "Failed to reset password",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }
}
