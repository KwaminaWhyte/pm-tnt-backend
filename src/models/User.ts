import mongoose, { type Model, Schema, Document } from "mongoose";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

/**
 * Interface for User Address
 */
interface UserAddressInterface {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  coordinates?: [number, number]; // [longitude, latitude]
  isPrimary?: boolean;
  label?: string; // e.g., "Home", "Work", etc.
}

/**
 * Interface for User Notification Settings
 */
interface UserNotificationSettingsInterface {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  bookingUpdates: boolean;
  promotions: boolean;
  newsletters: boolean;
}

/**
 * Interface for User Preferences
 */
interface UserPreferencesInterface {
  language: string;
  currency: string;
  timezone: string;
  travelPreferences?: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
}

/**
 * Interface for User Social Media
 */
interface UserSocialMediaInterface {
  platform: string; // e.g., "facebook", "instagram", etc.
  handle: string;
  url?: string;
}

/**
 * Interface for Emergency Contact
 */
interface EmergencyContactInterface {
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  priority: "high" | "medium" | "low";
  isActive?: boolean;
}

/**
 * Interface for User OTP
 */
interface UserOtpInterface {
  code: string;
  expiresAt: Date;
  attempts?: number;
}

/**
 * Interface for User Model
 */
interface UserModel extends Model<UserInterface> {
  findByEmail(email: string): Promise<UserInterface | null>;
  findByPhone(phone: string): Promise<UserInterface | null>;
  findByCredentials(
    email: string,
    password: string
  ): Promise<UserInterface | null>;
}

/**
 * Interface for User Document
 */
export interface UserInterface extends Document {
  firstName: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone: string;
  position?: string;
  photo?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  addresses?: UserAddressInterface[];
  notificationSettings?: UserNotificationSettingsInterface;
  preferences?: UserPreferencesInterface;
  socialMedia?: UserSocialMediaInterface[];
  emergencyContacts?: EmergencyContactInterface[];
  otp?: UserOtpInterface;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  loginCount?: number;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  deviceTokens?: string[];
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  role?: "user" | "premium" | "vip";
  memberSince?: Date;
  loyaltyPoints?: number;
  // Phone OTP fields
  phoneOtp?: string;
  phoneOtpExpires?: Date;
  // Two-Factor Authentication
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  tempTwoFactorSecret?: string;
  sessionVersion?: number;
  passwordChangedAt?: Date;
  biometricEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(password: string): Promise<boolean>;
  generatePasswordResetToken(): Promise<string>;
  generateEmailVerificationToken(): Promise<string>;
  updateLastLogin(): Promise<UserInterface>;
  addLoyaltyPoints(points: number): Promise<UserInterface>;
  setDefaultAddress(addressId: string): Promise<UserInterface>;
  addDeviceToken(token: string): Promise<UserInterface>;
  removeDeviceToken(token: string): Promise<UserInterface>;
}

/**
 * Schema for User Address
 */
const userAddressSchema = new Schema(
  {
    street: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function (v: number[]) {
          return (
            !v ||
            (v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 && // longitude
              v[1] >= -90 &&
              v[1] <= 90) // latitude
          );
        },
        message:
          "Coordinates must be [longitude, latitude] and within valid ranges",
      },
      index: "2dsphere",
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      trim: true,
      enum: {
        values: ["Home", "Work", "Other"],
        message: "{VALUE} is not a valid address label",
      },
    },
  },
  { _id: true }
);

/**
 * Schema for User Notification Settings
 */
const userNotificationSettingsSchema = new Schema(
  {
    email: {
      type: Boolean,
      default: true,
    },
    push: {
      type: Boolean,
      default: true,
    },
    sms: {
      type: Boolean,
      default: true,
    },
    marketing: {
      type: Boolean,
      default: false,
    },
    bookingUpdates: {
      type: Boolean,
      default: true,
    },
    promotions: {
      type: Boolean,
      default: false,
    },
    newsletters: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/**
 * Schema for User Preferences
 */
const userPreferencesSchema = new Schema(
  {
    language: {
      type: String,
      default: "en",
      trim: true,
      lowercase: true,
    },
    currency: {
      type: String,
      default: "USD",
      trim: true,
      uppercase: true,
    },
    timezone: {
      type: String,
      default: "UTC",
      trim: true,
    },
    travelPreferences: [
      {
        type: String,
        trim: true,
      },
    ],
    dietaryRestrictions: [
      {
        type: String,
        trim: true,
      },
    ],
    accessibilityNeeds: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

/**
 * Schema for User Social Media
 */
const userSocialMediaSchema = new Schema(
  {
    platform: {
      type: String,
      required: [true, "Social media platform is required"],
      trim: true,
      lowercase: true,
      enum: {
        values: [
          "facebook",
          "instagram",
          "twitter",
          "linkedin",
          "tiktok",
          "youtube",
          "other",
        ],
        message: "{VALUE} is not a supported social media platform",
      },
    },
    handle: {
      type: String,
      required: [true, "Social media handle is required"],
      trim: true,
    },
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "URL must be a valid URL",
      },
    },
  },
  { _id: true }
);

/**
 * Schema for Emergency Contact
 */
const emergencyContactSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Emergency contact name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    relationship: {
      type: String,
      required: [true, "Relationship is required"],
      trim: true,
      maxlength: [50, "Relationship cannot exceed 50 characters"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[0-9]\d{1,14}$/, "Invalid phone number format"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email format"],
    },
    priority: {
      type: String,
      enum: {
        values: ["high", "medium", "low"],
        message: "{VALUE} is not a valid priority level",
      },
      default: "medium",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

/**
 * Schema for User OTP
 */
const userOtpSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

/**
 * User Schema - Represents a user in the system
 *
 * @remarks
 * Users can authenticate via email/password or phone/OTP
 */
const userSchema = new Schema<UserInterface>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters long"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email format"],
      index: true,
    },
    password: {
      type: String,
      required: function (this: any) {
        return Boolean(this.email); // Password required only if email exists
      },
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password in query results by default
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^\+?[0-9]\d{1,14}$/, "Invalid phone number format"],
      index: true,
    },
    position: {
      type: String,
      trim: true,
      maxlength: [100, "Position cannot exceed 100 characters"],
    },
    photo: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Photo URL must be a valid URL",
      },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (v: Date) {
          return !v || v <= new Date();
        },
        message: "Date of birth cannot be in the future",
      },
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other", "prefer_not_to_say"],
        message: "{VALUE} is not a valid gender",
      },
    },
    addresses: [userAddressSchema],
    notificationSettings: {
      type: userNotificationSettingsSchema,
      default: () => ({}),
    },
    preferences: {
      type: userPreferencesSchema,
      default: () => ({}),
    },
    socialMedia: [userSocialMediaSchema],
    emergencyContacts: [emergencyContactSchema],
    otp: userOtpSchema,
    isPhoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: Date,
    loginCount: {
      type: Number,
      default: 0,
      min: [0, "Login count cannot be negative"],
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    // Phone OTP fields
    phoneOtp: {
      type: String,
      select: false, // Don't include in query results by default
    },
    phoneOtpExpires: {
      type: Date,
      select: false, // Don't include in query results by default
    },
    deviceTokens: [
      {
        type: String,
        trim: true,
      },
    ],
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    role: {
      type: String,
      enum: {
        values: ["user", "premium", "vip"],
        message: "{VALUE} is not a valid user role",
      },
      default: "user",
      index: true,
    },
    memberSince: {
      type: Date,
      default: Date.now,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: [0, "Loyalty points cannot be negative"],
    },
    // Two-Factor Authentication fields
    twoFactorSecret: {
      type: String,
      select: false, // Don't include in query results by default
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    tempTwoFactorSecret: {
      type: String,
      select: false, // Don't include in query results by default
    },
    sessionVersion: {
      type: Number,
      default: 1,
      min: [1, "Session version must be at least 1"],
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
    biometricEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "addresses.country": 1, "addresses.city": 1 });

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName || ""}`;
});

// Virtual for age
userSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;

  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
});

// Virtual for primary address
userSchema.virtual("primaryAddress").get(function () {
  if (!this.addresses || this.addresses.length === 0) return null;
  return (
    this.addresses.find((addr: UserAddressInterface) => addr.isPrimary) ||
    this.addresses[0]
  );
});

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
  // Trim whitespace from text fields
  if (this.isModified("firstName")) {
    this.firstName = this.firstName.trim();
  }
  if (this.isModified("lastName") && this.lastName) {
    this.lastName = this.lastName.trim();
  }

  // Hash password if modified
  if (this.isModified("password") && this.password) {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
  }

  // Generate referral code if not exists
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  }

  next();
});

// Methods

/**
 * Compare password with hashed password
 * @param password - Plain text password to compare
 */
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcryptjs.compare(password, this.password);
};

/**
 * Generate password reset token
 */
userSchema.methods.generatePasswordResetToken =
  async function (): Promise<string> {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires in 1 hour
    this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await this.save();

    return resetToken;
  };

/**
 * Generate email verification token
 */
userSchema.methods.generateEmailVerificationToken =
  async function (): Promise<string> {
    const verificationToken = crypto.randomBytes(32).toString("hex");

    this.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    // Token expires in 24 hours
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.save();

    return verificationToken;
  };

/**
 * Update last login timestamp
 */
userSchema.methods.updateLastLogin = async function (): Promise<UserInterface> {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

/**
 * Add loyalty points
 * @param points - Number of points to add
 */
userSchema.methods.addLoyaltyPoints = async function (
  points: number
): Promise<UserInterface> {
  this.loyaltyPoints = (this.loyaltyPoints || 0) + points;
  return this.save();
};

/**
 * Set default address
 * @param addressId - ID of the address to set as default
 */
userSchema.methods.setDefaultAddress = async function (
  addressId: string
): Promise<UserInterface> {
  if (!this.addresses || this.addresses.length === 0) {
    throw new Error("No addresses found");
  }

  const addressIndex = this.addresses.findIndex(
    (addr: any) => addr._id.toString() === addressId
  );
  if (addressIndex === -1) {
    throw new Error("Address not found");
  }

  // Reset all addresses to non-primary
  this.addresses.forEach((addr: any) => {
    addr.isPrimary = false;
  });

  // Set the selected address as primary
  this.addresses[addressIndex].isPrimary = true;

  return this.save();
};

/**
 * Add device token
 * @param token - Device token to add
 */
userSchema.methods.addDeviceToken = async function (
  token: string
): Promise<UserInterface> {
  if (!this.deviceTokens) {
    this.deviceTokens = [];
  }

  if (!this.deviceTokens.includes(token)) {
    this.deviceTokens.push(token);
  }

  return this.save();
};

/**
 * Remove device token
 * @param token - Device token to remove
 */
userSchema.methods.removeDeviceToken = async function (
  token: string
): Promise<UserInterface> {
  if (!this.deviceTokens) return this as UserInterface;

  this.deviceTokens = this.deviceTokens.filter((t: string) => t !== token);

  return this.save();
};

// Statics

/**
 * Find user by email
 * @param email - Email to search for
 */
userSchema.statics.findByEmail = async function (
  email: string
): Promise<UserInterface | null> {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find user by phone
 * @param phone - Phone number to search for
 */
userSchema.statics.findByPhone = async function (
  phone: string
): Promise<UserInterface | null> {
  return this.findOne({ phone });
};

/**
 * Find user by credentials
 * @param email - Email to search for
 * @param password - Password to verify
 */
userSchema.statics.findByCredentials = async function (
  email: string,
  password: string
): Promise<UserInterface | null> {
  const user = await this.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user) return null;

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return null;

  return user;
};

// Create or retrieve the model
let User: UserModel;
try {
  User = mongoose.model<UserInterface, UserModel>("User");
} catch (error) {
  User = mongoose.model<UserInterface, UserModel>("User", userSchema);
}

export default User;
