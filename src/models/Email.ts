import mongoose, { type Model, Schema, Document } from "mongoose";

/**
 * Interface for the Email document
 */
export interface EmailInterface extends Document {
  email: string;
  recipient?: {
    name?: string;
    user?: mongoose.Types.ObjectId;
  };
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>;
  cc?: string[];
  bcc?: string[];
  template?: string;
  templateData?: Record<string, any>;
  status: "pending" | "sent" | "failed" | "cancelled";
  sentAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  priority: "low" | "normal" | "high";
  type: "transactional" | "marketing" | "notification";
  createdAt: Date;
  updatedAt: Date;

  // Methods
  markAsSent(): Promise<EmailInterface>;
  markAsFailed(reason: string): Promise<EmailInterface>;
  retry(): Promise<boolean>;
}

/**
 * Email Schema - Represents email messages in the system
 */
const emailSchema = new Schema<EmailInterface>(
  {
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
      index: true,
    },
    recipient: {
      name: {
        type: String,
        trim: true,
      },
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [100, "Subject cannot exceed 100 characters"],
    },
    body: {
      type: String,
      required: [true, "Email body is required"],
    },
    htmlBody: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /<[a-z][\s\S]*>/i.test(v); // Basic HTML validation
        },
        message: "HTML body must contain valid HTML",
      },
    },
    attachments: [
      {
        filename: {
          type: String,
          required: [true, "Attachment filename is required"],
          trim: true,
        },
        path: {
          type: String,
          required: [true, "Attachment path is required"],
          trim: true,
        },
        contentType: {
          type: String,
          trim: true,
        },
      },
    ],
    cc: [
      {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function (v: string) {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
          },
          message: "Please enter a valid email address for CC",
        },
      },
    ],
    bcc: [
      {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function (v: string) {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
          },
          message: "Please enter a valid email address for BCC",
        },
      },
    ],
    template: {
      type: String,
      trim: true,
    },
    templateData: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "sent", "failed", "cancelled"],
        message: "{VALUE} is not a valid email status",
      },
      default: "pending",
      index: true,
    },
    sentAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, "Retry count cannot be negative"],
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: [0, "Max retries cannot be negative"],
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "normal", "high"],
        message: "{VALUE} is not a valid priority level",
      },
      default: "normal",
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ["transactional", "marketing", "notification"],
        message: "{VALUE} is not a valid email type",
      },
      default: "transactional",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
emailSchema.index({ email: 1, status: 1 });
emailSchema.index({ createdAt: -1 });

// Virtuals
emailSchema.virtual("canRetry").get(function () {
  return this.status === "failed" && this.retryCount < this.maxRetries;
});

emailSchema.virtual("isPending").get(function () {
  return this.status === "pending";
});

emailSchema.virtual("isComplete").get(function () {
  return this.status === "sent" || this.status === "cancelled";
});

// Methods

/**
 * Mark email as sent
 */
emailSchema.methods.markAsSent = async function (): Promise<EmailInterface> {
  this.status = "sent";
  this.sentAt = new Date();
  return this.save();
};

/**
 * Mark email as failed
 * @param reason - The reason for failure
 */
emailSchema.methods.markAsFailed = async function (
  reason: string
): Promise<EmailInterface> {
  this.status = "failed";
  this.failureReason = reason;
  return this.save();
};

/**
 * Retry sending the email
 * @returns Whether the retry was successful
 */
emailSchema.methods.retry = async function (): Promise<boolean> {
  if (this.status !== "failed" || this.retryCount >= this.maxRetries) {
    return false;
  }

  this.retryCount += 1;
  this.status = "pending";
  this.failureReason = undefined;
  await this.save();
  return true;
};

// Statics

/**
 * Find pending emails
 */
emailSchema.statics.findPending = async function (): Promise<EmailInterface[]> {
  return this.find({ status: "pending" })
    .sort({ priority: -1, createdAt: 1 })
    .limit(50);
};

/**
 * Find failed emails
 */
emailSchema.statics.findFailed = async function (): Promise<EmailInterface[]> {
  return this.find({
    status: "failed",
    retryCount: { $lt: "$maxRetries" },
  }).sort({ priority: -1, createdAt: 1 });
};

// Create or retrieve the model
let Email: Model<EmailInterface>;
try {
  Email = mongoose.model<EmailInterface>("Email");
} catch (error) {
  Email = mongoose.model<EmailInterface>("Email", emailSchema);
}

export default Email;
