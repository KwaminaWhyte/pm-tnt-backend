import mongoose, { type Model, Schema, Document } from "mongoose";

/**
 * Interface for the OTP model
 */
interface OtpModel extends Model<OtpInterface> {
  generateCode(length?: number): string;
  findValidOtp(code: string, type: string, identifier?: string): Promise<OtpInterface | null>;
  createOtp(
    userId: mongoose.Types.ObjectId,
    type: string,
    options?: {
      email?: string;
      phone?: string;
      expiresInMinutes?: number;
      codeLength?: number;
    }
  ): Promise<OtpInterface>;
}

/**
 * Interface for the OTP document
 */
export interface OtpInterface extends Document {
  user: mongoose.Types.ObjectId;
  phone?: string;
  email?: string;
  code: string;
  expiresAt: Date;
  type: "phone_verification" | "email_verification" | "password_reset" | "login";
  isUsed: boolean;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isValid(): boolean;
  markAsUsed(): Promise<OtpInterface>;
  incrementAttempt(): Promise<OtpInterface>;
  isExpired(): boolean;
}

/**
 * OTP Schema - Represents one-time passwords in the system
 */
const otpSchema = new Schema<OtpInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'User ID is required'],
      index: true
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: 'Please provide a valid phone number'
      },
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: 'Please provide a valid email address'
      },
      index: true
    },
    code: {
      type: String,
      required: [true, 'OTP code is required'],
      trim: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true
    },
    type: {
      type: String,
      enum: {
        values: ['phone_verification', 'email_verification', 'password_reset', 'login'],
        message: '{VALUE} is not a valid OTP type'
      },
      required: [true, 'OTP type is required'],
      index: true
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true
    },
    attempts: {
      type: Number,
      default: 0,
      min: [0, 'Attempts cannot be negative']
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: [1, 'Max attempts must be at least 1']
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance optimization
otpSchema.index({ expiresAt: 1 }); // For cleanup of expired OTPs
otpSchema.index({ user: 1, type: 1 }); // For finding user's OTPs by type

// Virtuals
otpSchema.virtual('isActive').get(function() {
  return !this.isUsed && !this.isExpired() && this.attempts < this.maxAttempts;
});

otpSchema.virtual('remainingAttempts').get(function() {
  return Math.max(0, this.maxAttempts - this.attempts);
});

// Methods

/**
 * Check if the OTP is valid (not expired, not used, attempts not exceeded)
 */
otpSchema.methods.isValid = function(): boolean {
  return !this.isUsed && !this.isExpired() && this.attempts < this.maxAttempts;
};

/**
 * Check if the OTP is expired
 */
otpSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

/**
 * Mark the OTP as used
 */
otpSchema.methods.markAsUsed = async function(): Promise<OtpInterface> {
  this.isUsed = true;
  return this.save();
};

/**
 * Increment the attempt counter
 */
otpSchema.methods.incrementAttempt = async function(): Promise<OtpInterface> {
  this.attempts += 1;
  return this.save();
};

// Statics

/**
 * Generate a new OTP code
 */
otpSchema.statics.generateCode = function(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
};

/**
 * Find valid OTP by code and type
 */
otpSchema.statics.findValidOtp = async function(
  code: string,
  type: string,
  identifier?: string
): Promise<OtpInterface | null> {
  const query: any = {
    code,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: '$maxAttempts' }
  };
  
  if (identifier) {
    // Check if identifier is an email or phone
    if (identifier.includes('@')) {
      query.email = identifier.toLowerCase();
    } else {
      query.phone = identifier;
    }
  }
  
  return this.findOne(query);
};

/**
 * Create a new OTP for a user
 */
otpSchema.statics.createOtp = async function(
  userId: mongoose.Types.ObjectId,
  type: string,
  options: {
    email?: string;
    phone?: string;
    expiresInMinutes?: number;
    codeLength?: number;
  } = {}
): Promise<OtpInterface> {
  const { email, phone, expiresInMinutes = 10, codeLength = 6 } = options;
  
  // Generate expiry date
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
  
  // Generate code
  const code = this.generateCode(codeLength);
  
  // Create new OTP
  const otp = new this({
    user: userId,
    email,
    phone,
    code,
    expiresAt,
    type
  });
  
  return otp.save();
};

// Create or retrieve the model
let Otp: OtpModel;
try {
  Otp = mongoose.model<OtpInterface, OtpModel>("Otp");
} catch (error) {
  Otp = mongoose.model<OtpInterface, OtpModel>("Otp", otpSchema);
}

export default Otp;
