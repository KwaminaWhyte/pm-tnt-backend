import mongoose, { Schema } from "mongoose";

export interface ReviewInterface {
  userId: Schema.Types.ObjectId;
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

const reviewSchema = new Schema<ReviewInterface>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ["hotel", "destination", "package", "vehicle"],
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    title: String,
    comment: String,
    images: [
      {
        type: String,
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
        ref: "users",
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    visitDate: Date,
    response: {
      text: String,
      respondedAt: Date,
      respondedBy: {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound indexes for common queries
reviewSchema.index({ itemId: 1, itemType: 1, rating: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

// Create text index for search
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

// Add validation to ensure itemId exists in the referenced collection
reviewSchema.pre("save", async function (next) {
  const Model = mongoose.model(this.itemType + "s");
  const item = await Model.findById(this.itemId);
  if (!item) {
    throw new Error(`${this.itemType} with id ${this.itemId} does not exist`);
  }
  next();
});

let Review;
try {
  Review = mongoose.model("reviews");
} catch (error) {
  Review = mongoose.model("reviews", reviewSchema);
}

export default Review;
