import bcrypt from "bcryptjs";
import Admin, { AdminInterface } from "../models/Admin";

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
      throw new Error(
        JSON.stringify({
          message: "Invalid Credentials",
          errors: [
            {
              type: "ValidationError",
              path: ["email"],
              message: "Invalid Credentials",
            },
          ],
        })
      );
    }

    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      throw new Error(
        JSON.stringify({
          message: "Invalid Credentials",
          errors: [
            {
              type: "ValidationError",
              path: ["password"],
              message: "Invalid Credentials",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            message: "Invalid pagination parameters",
            errors: [
              {
                type: "ValidationError",
                path: ["page", "limit"],
                message: "Page and limit must be positive numbers",
              },
            ],
          })
        );
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
        throw new Error(
          JSON.stringify({
            message: "Page number exceeds available pages",
            errors: [
              {
                type: "ValidationError",
                path: ["page"],
                message: `Page should be between 1 and ${totalPages}`,
              },
            ],
          })
        );
      }

      return {
        admins,
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
          message: "Failed to retrieve admins",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            message: "Admin not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Admin not found",
              },
            ],
          })
        );
      }

      return { user };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to retrieve admin",
          errors: [
            {
              type: "ServerError",
              path: ["id"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            message: "Email already exists",
            errors: [
              {
                type: "ValidationError",
                path: ["email"],
                message: "An admin with this email already exists",
              },
            ],
          })
        );
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
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to create admin",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
          throw new Error(
            JSON.stringify({
              message: "Email already exists",
              errors: [
                {
                  type: "ValidationError",
                  path: ["email"],
                  message: "An admin with this email already exists",
                },
              ],
            })
          );
        }
      }

      const admin = await Admin.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true }
      ).select("-password");

      if (!admin) {
        throw new Error(
          JSON.stringify({
            message: "Admin not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Admin not found",
              },
            ],
          })
        );
      }

      return {
        message: "Admin updated successfully",
        admin,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to update admin",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            message: "Admin not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Admin not found",
              },
            ],
          })
        );
      }

      return {
        message: "Admin deleted successfully",
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to delete admin",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            message: "Admin not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Admin not found",
              },
            ],
          })
        );
      }

      const isValidPassword = await bcrypt.compare(
        data.currentPassword,
        admin.password
      );

      if (!isValidPassword) {
        throw new Error(
          JSON.stringify({
            message: "Invalid current password",
            errors: [
              {
                type: "ValidationError",
                path: ["currentPassword"],
                message: "Current password is incorrect",
              },
            ],
          })
        );
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await Admin.findByIdAndUpdate(id, {
        password: hashedPassword,
      });

      return {
        message: "Password changed successfully",
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to change password",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
    }
  }
}
