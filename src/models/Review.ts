import mongoose, { Schema, Document, Model } from "mongoose";
import { UserInterface } from "../utils/types";

/**
 * Review Interface - Represents a user review for various items in the system
 */
export interface ReviewInterface {
  user: UserInterface | Schema.Types.ObjectId;
  itemId: Schema.Types.ObjectId;
  itemType: "hotel" | "destination" | "package" | "vehicle";
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  helpful: Schema.Types.ObjectId[];
  verified: boolean;
  visitDate?: Date;
  response?: {
    text: string;
    respondedAt: Date;
    respondedBy: Schema.Types.ObjectId;
  };
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response Schema - Represents a response to a review
 */
const responseSchema = new Schema(
  {
    text: {
      type: String,
      required: [true, 'Response text is required'],
      trim: true
    },
    respondedAt: {
      type: Date,
      default: Date.now
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'Responder reference is required']
    }
  },
  { _id: false }
);

/**
 * Review Schema - Represents a review in the system
 * 
 * @remarks
 * Reviews can be for hotels, destinations, packages, or vehicles
 */
const reviewSchema = new Schema<ReviewInterface & Document>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'User reference is required'],
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Item ID is required'],
      index: true,
    },
    itemType: {
      type: String,
      enum: {
        values: ["hotel", "destination", "package", "vehicle"],
        message: '{VALUE} is not a valid item type'
      },
      required: [true, 'Item type is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    images: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string) {
            return /^https?:\/\/.+/.test(v);
          },
          message: "Image URL must be a valid URL",
        },
      },
    ],
    helpful: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    visitDate: {
      type: Date,
      validate: {
        validator: function(value: Date) {
          return value <= new Date();
        },
        message: 'Visit date cannot be in the future'
      }
    },
    response: responseSchema,
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: '{VALUE} is not a valid review status'
      },
      default: "pending",
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
reviewSchema.index({ itemId: 1, itemType: 1, rating: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ createdAt: -1 }); // For sorting by most recent

// Text index for search
reviewSchema.index(
  {
    title: "text",
    comment: "text",
  },
  {
    weights: {
      title: 10,
      comment: 5,
    },
  }
);

// Virtuals
reviewSchema.virtual('helpfulCount').get(function() {
  return this.helpful ? this.helpful.length : 0;
});

reviewSchema.virtual('hasResponse').get(function() {
  return !!this.response && !!this.response.text;
});

/**
 * Validate that the itemId exists in the referenced collection
 */
reviewSchema.pre("save", async function (next) {
  try {
    // Convert itemType to model name (capitalize first letter and add 's' if needed)
    const modelName = this.itemType.charAt(0).toUpperCase() + this.itemType.slice(1);
    const Model = mongoose.model(modelName);
    const item = await Model.findById(this.itemId);
    
    if (!item) {
      return next(new Error(`${this.itemType} with id ${this.itemId} does not exist`));
    }
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

/**
 * Methods
 */
reviewSchema.methods.markAsVerified = function() {
  this.verified = true;
  return this.save();
};

reviewSchema.methods.addHelpful = function(userId: string | Schema.Types.ObjectId) {
  if (!this.helpful.includes(userId)) {
    this.helpful.push(userId);
  }
  return this.save();
};

reviewSchema.methods.removeHelpful = function(userId: string | Schema.Types.ObjectId) {
  this.helpful = this.helpful.filter(
    (id: Schema.Types.ObjectId) => id.toString() !== userId.toString()
  );
  return this.save();
};

reviewSchema.methods.addResponse = function(text: string, respondedBy: string | Schema.Types.ObjectId) {
  this.response = {
    text,
    respondedAt: new Date(),
    respondedBy: respondedBy
  };
  return this.save();
};

// Create or retrieve the model
let Review: Model<ReviewInterface & Document>;
try {
  Review = mongoose.model<ReviewInterface & Document>("Review");
} catch (error) {
  Review = mongoose.model<ReviewInterface & Document>("Review", reviewSchema);
}

export default Review;
