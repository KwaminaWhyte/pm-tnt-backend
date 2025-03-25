import { Schema } from "mongoose";
import mongoose from "~/mongoose";

export interface ActivityInterface {
  name: string;
  description?: string;
  destination: Schema.Types.ObjectId;
  duration: number;
  price: number;
  category: "Adventure" | "Cultural" | "Nature" | "Entertainment";
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  images: string[];
  maxParticipants?: number;
  minParticipants?: number;
  requirements?: string[];
  included?: string[];
  excluded?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<ActivityInterface>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    destination: {
      type: Schema.Types.ObjectId,
      ref: "destinations",
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ["Adventure", "Cultural", "Nature", "Entertainment"],
      required: true,
      index: true,
    },
    availability: [
      {
        dayOfWeek: {
          type: Number,
          min: 0,
          max: 6,
          required: true,
        },
        startTime: {
          type: String,
          required: true,
          validate: {
            validator: function (v: string) {
              return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: "Start time must be in HH:mm format",
          },
        },
        endTime: {
          type: String,
          required: true,
          validate: {
            validator: function (v: string) {
              return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: "End time must be in HH:mm format",
          },
        },
      },
    ],
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
    maxParticipants: {
      type: Number,
      min: 1,
    },
    minParticipants: {
      type: Number,
      min: 1,
      validate: {
        validator: function (this: ActivityInterface, v: number) {
          return !this.maxParticipants || v <= this.maxParticipants;
        },
        message:
          "Minimum participants cannot be greater than maximum participants",
      },
    },
    requirements: [String],
    included: [String],
    excluded: [String],
  },
  {
    timestamps: true,
  }
);

// Create compound indexes for common queries
activitySchema.index({ destination: 1, category: 1 });
activitySchema.index({ price: 1, duration: 1 });

// Create text index for search
activitySchema.index(
  {
    name: "text",
    description: "text",
  },
  {
    weights: {
      name: 10,
      description: 5,
    },
  }
);

let Activity;
try {
  Activity = mongoose.model("activities");
} catch (error) {
  Activity = mongoose.model("activities", activitySchema);
}

export default Activity;
