import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Interface for the Notification document
 */
export interface NotificationInterface extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  read: boolean;
  relatedId?: mongoose.Types.ObjectId;
  relatedType?: string;
  priority: "low" | "medium" | "high";
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markAsRead(): Promise<NotificationInterface>;
  markAsUnread(): Promise<NotificationInterface>;
  isExpired(): boolean;
}

/**
 * Notification Schema - Represents user notifications in the system
 */
const notificationSchema = new Schema<NotificationInterface>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'User ID is required'],
      index: true
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          "booking_confirmed",
          "payment_success",
          "booking_reminder",
          "special_offer",
          "vehicle_ready",
          "booking_canceled",
          "welcome",
          "review_reminder",
          "price_drop",
          "system_alert"
        ],
        message: '{VALUE} is not a valid notification type'
      },
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
      description: 'ID of the related entity (booking, payment, etc.)'
    },
    relatedType: {
      type: String,
      required: false,
      enum: {
        values: ["booking", "payment", "vehicle", "hotel", "package", "review"],
        message: '{VALUE} is not a valid related type'
      },
      description: 'Type of the related entity'
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: '{VALUE} is not a valid priority level'
      },
      default: "medium"
    },
    expiresAt: {
      type: Date,
      required: false,
      description: 'Date when the notification expires'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create indexes for performance optimization
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Virtuals
notificationSchema.virtual('isRecent').get(function() {
  const RECENT_THRESHOLD_HOURS = 24;
  const hoursAgo = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursAgo < RECENT_THRESHOLD_HOURS;
});

// Methods

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function(): Promise<NotificationInterface> {
  this.read = true;
  return this.save();
};

/**
 * Mark notification as unread
 */
notificationSchema.methods.markAsUnread = async function(): Promise<NotificationInterface> {
  this.read = false;
  return this.save();
};

/**
 * Check if notification is expired
 */
notificationSchema.methods.isExpired = function(): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Statics

/**
 * Mark all notifications as read for a user
 */
notificationSchema.statics.markAllAsRead = async function(userId: mongoose.Types.ObjectId): Promise<number> {
  const result = await this.updateMany(
    { userId, read: false },
    { $set: { read: true } }
  );
  return result.modifiedCount;
};

/**
 * Get unread count for a user
 */
notificationSchema.statics.getUnreadCount = async function(userId: mongoose.Types.ObjectId): Promise<number> {
  return this.countDocuments({ userId, read: false });
};

// Create or retrieve the model
let Notification: Model<NotificationInterface>;
try {
  Notification = mongoose.model<NotificationInterface>("Notification");
} catch (error) {
  Notification = mongoose.model<NotificationInterface>("Notification", notificationSchema);
}

export default Notification;
