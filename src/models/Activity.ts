import mongoose, { Schema, Model, Document } from "mongoose";

/**
 * Interface for the Activity document
 */
export interface ActivityInterface extends Document {
  name: string;
  description?: string;
  destination: mongoose.Types.ObjectId;
  duration: number;
  price: number;
  discountPrice?: number;
  category:
    | "Adventure"
    | "Cultural"
    | "Nature"
    | "Entertainment"
    | "Relaxation"
    | "Educational";
  difficulty: "Easy" | "Moderate" | "Challenging" | "Expert";
  ageRestriction?: {
    minimum?: number;
    maximum?: number;
  };
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    maxSpots?: number;
  }>;
  location?: {
    address?: string;
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  images: string[];
  maxParticipants?: number;
  minParticipants?: number;
  requirements?: string[];
  included?: string[];
  excluded?: string[];
  ratings?: Array<{
    user: mongoose.Types.ObjectId;
    rating: number;
    comment?: string;
    date: Date;
  }>;
  status: "Active" | "Inactive" | "Seasonal";
  seasonalAvailability?: {
    startMonth: number;
    endMonth: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isAvailableOnDate(date: Date): boolean;
  calculateAverageRating(): number;
  getUpcomingAvailability(days: number): Array<Date>;
}

/**
 * Time slot schema for activity availability
 */
const timeSlotSchema = new Schema(
  {
    dayOfWeek: {
      type: Number,
      min: [0, "Day of week must be between 0 (Sunday) and 6 (Saturday)"],
      max: [6, "Day of week must be between 0 (Sunday) and 6 (Saturday)"],
      required: [true, "Day of week is required"],
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      validate: {
        validator: function (v: string) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Start time must be in HH:mm format",
      },
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      validate: {
        validator: function (v: string) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "End time must be in HH:mm format",
      },
    },
    maxSpots: {
      type: Number,
      min: [1, "Maximum spots must be at least 1"],
    },
  },
  { _id: true }
);

/**
 * Rating schema for activity reviews
 */
const ratingSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Location schema for activity
 */
const locationSchema = new Schema(
  {
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
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
 * Age restriction schema
 */
const ageRestrictionSchema = new Schema(
  {
    minimum: {
      type: Number,
      min: [0, "Minimum age cannot be negative"],
    },
    maximum: {
      type: Number,
      min: [0, "Maximum age cannot be negative"],
      validate: {
        validator: function (this: any, v: number) {
          return !this.minimum || v >= this.minimum;
        },
        message: "Maximum age must be greater than or equal to minimum age",
      },
    },
  },
  { _id: false }
);

/**
 * Seasonal availability schema
 */
const seasonalAvailabilitySchema = new Schema(
  {
    startMonth: {
      type: Number,
      required: [true, "Start month is required"],
      min: [1, "Month must be between 1 and 12"],
      max: [12, "Month must be between 1 and 12"],
    },
    endMonth: {
      type: Number,
      required: [true, "End month is required"],
      min: [1, "Month must be between 1 and 12"],
      max: [12, "Month must be between 1 and 12"],
    },
  },
  { _id: false }
);

/**
 * Activity Schema - Represents activities available for booking
 */
const activitySchema = new Schema<ActivityInterface>(
  {
    name: {
      type: String,
      required: [true, "Activity name is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    destination: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "Destination is required"],
      index: true,
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [0, "Duration must be non-negative"],
      index: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be non-negative"],
      index: true,
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price must be non-negative"],
    },
    category: {
      type: String,
      enum: {
        values: [
          "Adventure",
          "Cultural",
          "Nature",
          "Entertainment",
          "Relaxation",
          "Educational",
        ],
        message: "{VALUE} is not a valid category",
      },
      required: [true, "Category is required"],
      index: true,
    },
    difficulty: {
      type: String,
      enum: {
        values: ["Easy", "Moderate", "Challenging", "Expert"],
        message: "{VALUE} is not a valid difficulty level",
      },
      default: "Moderate",
    },
    ageRestriction: ageRestrictionSchema,
    availability: [timeSlotSchema],
    location: locationSchema,
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
      min: [1, "Maximum participants must be at least 1"],
    },
    minParticipants: {
      type: Number,
      min: [1, "Minimum participants must be at least 1"],
      validate: {
        validator: function (this: any, v: number) {
          return !this.maxParticipants || v <= this.maxParticipants;
        },
        message:
          "Minimum participants cannot be greater than maximum participants",
      },
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    included: [
      {
        type: String,
        trim: true,
      },
    ],
    excluded: [
      {
        type: String,
        trim: true,
      },
    ],
    ratings: [ratingSchema],
    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive", "Seasonal"],
        message: "{VALUE} is not a valid status",
      },
      default: "Active",
      index: true,
    },
    seasonalAvailability: seasonalAvailabilitySchema,
    isActive: {
      type: Boolean,
      default: true,
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
activitySchema.index({ destination: 1, category: 1 });
activitySchema.index({ price: 1, duration: 1 });
activitySchema.index({ "location.city": 1, "location.country": 1 });

// Text index for search
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

// Virtuals
activitySchema.virtual("averageRating").get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

activitySchema.virtual("hasDiscount").get(function () {
  return !!this.discountPrice && this.discountPrice < this.price;
});

activitySchema.virtual("discountPercentage").get(function () {
  if (!this.discountPrice || this.discountPrice >= this.price) return 0;
  return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

// Methods

/**
 * Check if activity is available on a specific date
 * @param date - The date to check availability for
 * @returns Whether the activity is available on the specified date
 */
activitySchema.methods.isAvailableOnDate = function (date: Date): boolean {
  if (!this.isActive || this.status === "Inactive") return false;

  // Check seasonal availability if defined
  if (this.seasonalAvailability) {
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const { startMonth, endMonth } = this.seasonalAvailability;

    if (startMonth <= endMonth) {
      // Normal range (e.g., April to October)
      if (month < startMonth || month > endMonth) return false;
    } else {
      // Wrapped range (e.g., November to February)
      if (month < startMonth && month > endMonth) return false;
    }
  }

  // Check day of week availability
  const dayOfWeek = date.getDay();
  return this.availability.some((slot) => slot.dayOfWeek === dayOfWeek);
};

/**
 * Calculate the average rating for this activity
 * @returns The average rating (0 if no ratings)
 */
activitySchema.methods.calculateAverageRating = function (): number {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
};

/**
 * Get upcoming availability for the next specified number of days
 * @param days - Number of days to check
 * @returns Array of dates when the activity is available
 */
activitySchema.methods.getUpcomingAvailability = function (
  days: number = 30
): Array<Date> {
  if (!this.isActive || this.status === "Inactive") return [];

  const availableDates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    if (this.isAvailableOnDate(date)) {
      availableDates.push(date);
    }
  }

  return availableDates;
};

// Statics

/**
 * Find activities by destination
 */
activitySchema.statics.findByDestination = async function (
  destinationId: mongoose.Types.ObjectId
): Promise<ActivityInterface[]> {
  return this.find({ destination: destinationId, isActive: true }).sort({
    price: 1,
  });
};

/**
 * Find activities by category
 */
activitySchema.statics.findByCategory = async function (
  category: string
): Promise<ActivityInterface[]> {
  return this.find({ category, isActive: true }).sort({ price: 1 });
};

// Create or retrieve the model
let Activity: Model<ActivityInterface>;
try {
  Activity = mongoose.model<ActivityInterface>("Activity");
} catch (error) {
  Activity = mongoose.model<ActivityInterface>("Activity", activitySchema);
}

export default Activity;
