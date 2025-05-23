import mongoose, { type Model, Schema, Document } from "mongoose";

/**
 * Interface for UserDevice Model
 */
interface UserDeviceModel extends Model<UserDeviceInterface> {
  findByToken(token: string): Promise<UserDeviceInterface | null>;
  findByUser(userId: mongoose.Types.ObjectId): Promise<UserDeviceInterface[]>;
  removeByToken(token: string): Promise<boolean>;
}

/**
 * Interface for UserDevice Document
 */
export interface UserDeviceInterface extends Document {
  user: mongoose.Types.ObjectId;
  deviceToken: string;
  deviceType: "ios" | "android" | "web" | "desktop" | string;
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  lastActive?: Date;
  isActive: boolean;
  notificationsEnabled: boolean;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateLastActive(): Promise<UserDeviceInterface>;
  toggleNotifications(enabled: boolean): Promise<UserDeviceInterface>;
  deactivate(): Promise<UserDeviceInterface>;
}

/**
 * Schema for UserDevice
 */
const userDeviceSchema = new Schema<UserDeviceInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'User ID is required'],
      index: true
    },
    deviceToken: { 
      type: String, 
      required: [true, 'Device token is required'],
      unique: true,
      trim: true,
      index: true
    },
    deviceType: { 
      type: String, 
      required: [true, 'Device type is required'],
      trim: true,
      lowercase: true,
      enum: {
        values: ['ios', 'android', 'web', 'desktop'],
        message: '{VALUE} is not a supported device type'
      }
    },
    deviceName: { 
      type: String, 
      required: [true, 'Device name is required'],
      trim: true
    },
    deviceModel: {
      type: String,
      trim: true
    },
    osVersion: {
      type: String,
      trim: true
    },
    appVersion: {
      type: String,
      trim: true
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    location: {
      country: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(v: number[]) {
            return !v || (
              v.length === 2 &&
              v[0] >= -180 && v[0] <= 180 && // longitude
              v[1] >= -90 && v[1] <= 90 // latitude
            );
          },
          message: 'Coordinates must be [longitude, latitude] and within valid ranges'
        },
        index: '2dsphere'
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance optimization
userDeviceSchema.index({ user: 1, deviceType: 1 });
userDeviceSchema.index({ createdAt: -1 });

// Methods

/**
 * Update last active timestamp
 */
userDeviceSchema.methods.updateLastActive = async function(): Promise<UserDeviceInterface> {
  this.lastActive = new Date();
  return this.save();
};

/**
 * Toggle notifications
 * @param enabled - Whether notifications should be enabled
 */
userDeviceSchema.methods.toggleNotifications = async function(enabled: boolean): Promise<UserDeviceInterface> {
  this.notificationsEnabled = enabled;
  return this.save();
};

/**
 * Deactivate device
 */
userDeviceSchema.methods.deactivate = async function(): Promise<UserDeviceInterface> {
  this.isActive = false;
  return this.save();
};

// Statics

/**
 * Find device by token
 * @param token - Device token to search for
 */
userDeviceSchema.statics.findByToken = async function(token: string): Promise<UserDeviceInterface | null> {
  return this.findOne({ deviceToken: token });
};

/**
 * Find devices by user
 * @param userId - User ID to search for
 */
userDeviceSchema.statics.findByUser = async function(userId: mongoose.Types.ObjectId): Promise<UserDeviceInterface[]> {
  return this.find({ user: userId, isActive: true }).sort({ lastActive: -1 });
};

/**
 * Remove device by token
 * @param token - Device token to remove
 */
userDeviceSchema.statics.removeByToken = async function(token: string): Promise<boolean> {
  const result = await this.deleteOne({ deviceToken: token });
  return result.deletedCount > 0;
};

// Create or retrieve the model
let UserDevice: UserDeviceModel;
try {
  UserDevice = mongoose.model<UserDeviceInterface, UserDeviceModel>("UserDevice");
} catch (error) {
  UserDevice = mongoose.model<UserDeviceInterface, UserDeviceModel>("UserDevice", userDeviceSchema);
}

export default UserDevice;
