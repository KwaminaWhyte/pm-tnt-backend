import bcrypt from "bcryptjs";
import Admin, { AdminInterface } from "~/models/Admin";
import {
  NotFoundError,
  ValidationError,
  AuthenticationError,
  ServerError,
  DuplicateError,
} from "~/utils/errors";

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
    try {
      // Find the admin with all fields including password
      const admin = await Admin.findByEmail(email);

      if (!admin) {
        // Use JSON error format that will be parsed by the global error handler
        throw new Error(
          JSON.stringify({
            message: "Admin not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["email"],
                message: "No admin found with this email",
              },
            ],
          })
        );
      }

      const valid = await admin.comparePassword(password);

      if (!valid) {
        // Use JSON error format that will be parsed by the global error handler
        throw new Error(
          JSON.stringify({
            message: "Authentication failed",
            errors: [
              {
                type: "AuthenticationError",
                path: ["password"],
                message: "Invalid credentials",
              },
            ],
          })
        );
      }

      const token = await jwt_auth.sign({ id: admin.id });
      const userData = await Admin.findById(admin.id).select("-password -otp");

      return {
        token,
        user: userData,
      };
    } catch (err) {
      // If it's already a formatted JSON error, just re-throw it
      if (err instanceof Error && err.message.startsWith("{")) {
        throw err;
      }

      // Otherwise, format as a server error
      throw new Error(
        JSON.stringify({
          message: "Login failed",
          errors: [
            {
              type: "ServerError",
              path: [],
              message:
                err instanceof Error
                  ? err.message
                  : "An unexpected error occurred",
            },
          ],
        })
      );
    }
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
        throw new ValidationError("Page and limit must be positive numbers");
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
        throw new ValidationError(
          `Page should be between 1 and ${totalPages}`,
          "page"
        );
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
      // Re-throw custom errors directly
      if (err instanceof ValidationError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    }
  }

  /**
   * Get admin by ID
   * @throws {NotFoundError} When admin is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async getAdmin(id: string) {
    try {
      const user = await Admin.findById(id).select("-password");

      if (!user) {
        throw new NotFoundError("Admin", id);
      }

      return { user };
    } catch (err) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    }
  }

  /**
   * Create new admin
   * @throws {DuplicateError} When email already exists
   * @throws {ValidationError} When validation fails
   * @throws {ServerError} When an unexpected error occurs
   */
  async createAdmin(data: CreateAdminDTO) {
    try {
      // Check if email already exists
      const existingAdmin = await Admin.findOne({ email: data.email });
      if (existingAdmin) {
        throw new DuplicateError("Admin", "email");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create admin
      const admin = await Admin.create({
        ...data,
        password: hashedPassword,
      });

      // Remove password from response
      const adminData = admin.toObject() as Record<string, any>;
      delete adminData.password;

      return {
        message: "Admin created successfully",
        admin: adminData,
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof DuplicateError || err instanceof ValidationError) {
        throw err;
      }

      // MongoDB duplicate key error
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === 11000
      ) {
        throw new DuplicateError("Admin", "email");
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    }
  }

  /**
   * Update admin
   * @throws {NotFoundError} When admin is not found
   * @throws {DuplicateError} When email already exists
   * @throws {ValidationError} When validation fails
   * @throws {ServerError} When an unexpected error occurs
   */
  async updateAdmin(id: string, data: UpdateAdminDTO) {
    try {
      // Check if admin exists
      const existingAdmin = await Admin.findById(id);
      if (!existingAdmin) {
        throw new NotFoundError("Admin", id);
      }

      // Check if email is being updated and if it already exists
      if (data.email && data.email !== existingAdmin.email) {
        const emailExists = await Admin.findOne({ email: data.email });
        if (emailExists) {
          throw new DuplicateError("Admin", "email");
        }
      }

      // Update admin
      const admin = await Admin.findByIdAndUpdate(
        id,
        { ...data },
        { new: true }
      ).select("-password");

      if (!admin) {
        throw new NotFoundError("Admin", id);
      }

      return {
        message: "Admin updated successfully",
        admin,
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (
        err instanceof NotFoundError ||
        err instanceof DuplicateError ||
        err instanceof ValidationError
      ) {
        throw err;
      }

      // MongoDB duplicate key error
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === 11000
      ) {
        throw new DuplicateError("Admin", "email");
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    }
  }

  /**
   * Delete admin
   * @throws {NotFoundError} When admin is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async deleteAdmin(id: string) {
    try {
      const admin = await Admin.findByIdAndDelete(id);

      if (!admin) {
        throw new NotFoundError("Admin", id);
      }

      return {
        message: "Admin deleted successfully",
      };
    } catch (err: unknown) {
      // Re-throw NotFoundError directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    }
  }

  /**
   * Change admin password
   * @throws {NotFoundError} When admin is not found
   * @throws {ValidationError} When current password is invalid
   * @throws {ServerError} When an unexpected error occurs
   */
  async changePassword(id: string, data: ChangePasswordDTO) {
    try {
      const admin = await Admin.findById(id);

      if (!admin) {
        throw new NotFoundError("Admin", id);
      }

      const isValidPassword = await bcrypt.compare(
        data.currentPassword,
        admin.password
      );

      if (!isValidPassword) {
        throw new ValidationError(
          "Current password is incorrect",
          "currentPassword"
        );
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await Admin.findByIdAndUpdate(id, {
        password: hashedPassword,
      });

      return {
        message: "Password changed successfully",
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    }
  }

  /**
   * Reset admin password (super admin only)
   * @param id - Admin ID
   * @param data - Password data
   * @throws {NotFoundError} When admin is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async resetPassword(id: string, data: { password: string }) {
    try {
      const admin = await Admin.findById(id);
      if (!admin) {
        throw new NotFoundError("Admin", id);
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      await Admin.findByIdAndUpdate(id, {
        password: hashedPassword,
      });
      return {
        message: "Password reset successfully",
      };
    } catch (err: unknown) {
      // Re-throw NotFoundError directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    }
  }
}
