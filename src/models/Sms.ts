import mongoose, { type Model, Schema, Document } from "mongoose";

/**
 * Interface for the SMS document
 */
export interface SmsInterface extends Document {
  phone: string;
  from: string;
  message: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  sentAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  priority: "low" | "normal" | "high";
  type: "verification" | "notification" | "marketing";
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markAsSent(): Promise<SmsInterface>;
  markAsFailed(reason: string): Promise<SmsInterface>;
  retry(): Promise<boolean>;
}

/**
 * SMS Schema - Represents SMS messages in the system
 */
const smsSchema = new Schema<SmsInterface>(
  {
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: 'Please provide a valid phone number'
      },
      index: true
    },
    from: { 
      type: String, 
      required: [true, 'Sender is required'],
      trim: true
    },
    message: { 
      type: String, 
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'sent', 'failed', 'cancelled'],
        message: '{VALUE} is not a valid SMS status'
      },
      default: 'pending',
      index: true
    },
    sentAt: {
      type: Date
    },
    failureReason: {
      type: String,
      trim: true
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative']
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: [0, 'Max retries cannot be negative']
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high'],
        message: '{VALUE} is not a valid priority level'
      },
      default: 'normal',
      index: true
    },
    type: {
      type: String,
      enum: {
        values: ['verification', 'notification', 'marketing'],
        message: '{VALUE} is not a valid SMS type'
      },
      default: 'notification',
      index: true
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance optimization
smsSchema.index({ phone: 1, status: 1 });
smsSchema.index({ createdAt: -1 });

// Virtuals
smsSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
});

smsSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

smsSchema.virtual('isComplete').get(function() {
  return this.status === 'sent' || this.status === 'cancelled';
});

// Methods

/**
 * Mark SMS as sent
 */
smsSchema.methods.markAsSent = async function(): Promise<SmsInterface> {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

/**
 * Mark SMS as failed
 * @param reason - The reason for failure
 */
smsSchema.methods.markAsFailed = async function(reason: string): Promise<SmsInterface> {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

/**
 * Retry sending the SMS
 * @returns Whether the retry was successful
 */
smsSchema.methods.retry = async function(): Promise<boolean> {
  if (this.status !== 'failed' || this.retryCount >= this.maxRetries) {
    return false;
  }
  
  this.retryCount += 1;
  this.status = 'pending';
  this.failureReason = undefined;
  await this.save();
  return true;
};

// Statics

/**
 * Find pending SMS messages
 */
smsSchema.statics.findPending = async function(): Promise<SmsInterface[]> {
  return this.find({ status: 'pending' })
    .sort({ priority: -1, createdAt: 1 })
    .limit(50);
};

/**
 * Find failed SMS messages
 */
smsSchema.statics.findFailed = async function(): Promise<SmsInterface[]> {
  return this.find({ 
    status: 'failed',
    retryCount: { $lt: '$maxRetries' }
  }).sort({ priority: -1, createdAt: 1 });
};

// Create or retrieve the model
let Sms: Model<SmsInterface>;
try {
  Sms = mongoose.model<SmsInterface>("Sms");
} catch (error) {
  Sms = mongoose.model<SmsInterface>("Sms", smsSchema);
}

export default Sms;
