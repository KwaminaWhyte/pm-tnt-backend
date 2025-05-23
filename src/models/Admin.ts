import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Interface for the Admin document
 */
export interface AdminInterface extends Document {
  fullName: string;
  email: string;
  password: string;
  role: "admin" | "super_admin";
  lastLogin?: Date;
  isActive: boolean;
  permissions?: string[];
  profileImage?: string;
  phoneNumber?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): Promise<string>;
}

/**
 * Admin Schema - Represents admin users in the system
 */
const adminSchema = new Schema<AdminInterface>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters long"],
      maxlength: [50, "Full name cannot exceed 50 characters"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value);
        },
        message: "Please enter a valid email address",
      },
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Don't include password in query results by default
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "super_admin"],
        message: "{VALUE} is not a valid role",
      },
      default: "admin",
      index: true,
    },
    lastLogin: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
    profileImage: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Profile image must be a valid URL",
      },
    },
    phoneNumber: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: "Please provide a valid phone number",
      },
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
adminSchema.index({ email: 1, role: 1 });

// Pre-save middleware to hash password
adminSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Methods

/**
 * Compare a candidate password with the admin's password
 * @param candidatePassword - The password to check
 * @returns Whether the password matches
 */
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    // @ts-ignore: password might be undefined in the type but we know it exists
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

/**
 * Generate a password reset token and set expiry
 * @returns The generated token
 */
adminSchema.methods.generatePasswordResetToken =
  async function (): Promise<string> {
    // Generate random token
    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Set token and expiry (1 hour from now)
    this.resetPasswordToken = token;
    this.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.save();
    return token;
  };

// Statics

/**
 * Find admin by email
 */
adminSchema.statics.findByEmail = async function (
  email: string
): Promise<AdminInterface | null> {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find admin by reset password token
 */
adminSchema.statics.findByResetToken = async function (
  token: string
): Promise<AdminInterface | null> {
  return this.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
};

// Create or retrieve the model
let Admin: Model<AdminInterface>;
try {
  Admin = mongoose.model<AdminInterface>("Admin");
} catch (error) {
  Admin = mongoose.model<AdminInterface>("Admin", adminSchema);
}

export default Admin;
