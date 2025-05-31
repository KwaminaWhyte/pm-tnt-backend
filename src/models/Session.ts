import mongoose, { Schema, Model, Document } from "mongoose";

/**
 * Interface for the Session document
 */
export interface SessionInterface extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  sessionVersion: number;
  deviceInfo: string;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  isActive: boolean;
  lastActivity: Date;
  terminatedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  updateActivity(): Promise<SessionInterface>;
  isExpired(): boolean;
  terminate(): Promise<SessionInterface>;
}

/**
 * Location schema for session
 */
const locationSchema = new Schema(
  {
    country: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"],
      },
      longitude: {
        type: Number,
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"],
      },
    },
  },
  { _id: false }
);

/**
 * Session Schema - Tracks user login sessions across devices
 */
const sessionSchema = new Schema<SessionInterface>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    token: {
      type: String,
      required: [true, "Token is required"],
      unique: true,
      index: true,
    },
    sessionVersion: {
      type: Number,
      default: 1,
      min: [1, "Session version must be at least 1"],
    },
    deviceInfo: {
      type: String,
      default: "Unknown Device",
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Optional field
          // Basic IP validation (IPv4 and IPv6)
          const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
          const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(v) || ipv6Regex.test(v);
        },
        message: "Invalid IP address format",
      },
    },
    location: locationSchema,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    terminatedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ userId: 1, lastActivity: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtuals
sessionSchema.virtual("isExpiredVirtual").get(function () {
  return new Date() > this.expiresAt;
});

sessionSchema.virtual("deviceType").get(function () {
  if (!this.userAgent) return "Unknown";

  const ua = this.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    return "Mobile";
  } else if (/ipad|tablet/i.test(ua)) {
    return "Tablet";
  } else if (/desktop|chrome|firefox|safari|edge|msie|trident/i.test(ua)) {
    return "Desktop";
  }
  return "Unknown";
});

// Methods

/**
 * Update last activity timestamp
 */
sessionSchema.methods.updateActivity = function (): Promise<SessionInterface> {
  this.lastActivity = new Date();
  return this.save();
};

/**
 * Check if session is expired
 */
sessionSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

/**
 * Terminate session
 */
sessionSchema.methods.terminate = function (): Promise<SessionInterface> {
  this.isActive = false;
  this.terminatedAt = new Date();
  return this.save();
};

// Static methods

/**
 * Cleanup expired and old terminated sessions
 */
sessionSchema.statics.cleanupExpired = async function (): Promise<any> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      {
        isActive: false,
        terminatedAt: { $lt: sevenDaysAgo },
      },
    ],
  });
};

/**
 * Parse device info from user agent string
 */
sessionSchema.statics.parseDeviceInfo = function (userAgent?: string): string {
  if (!userAgent) return "Unknown Device";

  const ua = userAgent.toLowerCase();

  // Mobile devices
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    if (/iphone|ipod/i.test(ua)) return "iPhone";
    if (/ipad/i.test(ua)) return "iPad";
    if (/android/i.test(ua)) return "Android Device";
    if (/blackberry/i.test(ua)) return "BlackBerry";
    if (/windows phone/i.test(ua)) return "Windows Phone";
    return "Mobile Device";
  }

  // Desktop browsers
  if (/chrome/i.test(ua)) return "Chrome Browser";
  if (/firefox/i.test(ua)) return "Firefox Browser";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari Browser";
  if (/edge/i.test(ua)) return "Edge Browser";
  if (/msie|trident/i.test(ua)) return "Internet Explorer";

  return "Desktop Browser";
};

/**
 * Find active sessions by user ID
 */
sessionSchema.statics.findActiveByUserId = async function (
  userId: mongoose.Types.ObjectId
): Promise<SessionInterface[]> {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 });
};

/**
 * Terminate all sessions for a user except current
 */
sessionSchema.statics.terminateAllExceptCurrent = async function (
  userId: mongoose.Types.ObjectId,
  currentToken: string
): Promise<any> {
  return this.updateMany(
    {
      userId,
      isActive: true,
      token: { $ne: currentToken },
    },
    {
      isActive: false,
      terminatedAt: new Date(),
    }
  );
};

// Create or retrieve the model
let Session: Model<SessionInterface>;
try {
  Session = mongoose.model<SessionInterface>("Session");
} catch (error) {
  Session = mongoose.model<SessionInterface>("Session", sessionSchema);
}

export default Session;
