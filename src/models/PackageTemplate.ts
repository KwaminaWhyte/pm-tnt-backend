import { Schema } from "mongoose";
import mongoose from "../mongoose";

export interface PackageTemplateInterface {
  userId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  basePackageId: Schema.Types.ObjectId;
  customizations: {
    accommodations?: {
      hotelIds: Schema.Types.ObjectId[];
      preferences: {
        roomTypes: string[];
        amenities: string[];
        boardBasis: string[];
        location: string[];
      };
    };
    transportation?: {
      type: "Flight" | "Train" | "Bus" | "Private Car" | "None";
      preferences: {
        class: string;
        seatingPreference: string;
        specialAssistance: string[];
        luggageOptions: string[];
      };
    };
    activities?: {
      included: Schema.Types.ObjectId[];
      excluded: Schema.Types.ObjectId[];
      preferences: {
        difficulty: string[];
        duration: string[];
        type: string[];
        timeOfDay: string[];
      };
    };
    meals?: {
      included: {
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
      };
      preferences: {
        dietary: string[];
        cuisine: string[];
        mealTimes: {
          breakfast?: string;
          lunch?: string;
          dinner?: string;
        };
      };
    };
    itinerary?: {
      pace: "Relaxed" | "Moderate" | "Fast";
      flexibility: "Fixed" | "Flexible" | "Very Flexible";
      focusAreas: string[];
      customDays: Array<{
        day: number;
        title: string;
        description: string;
        activities: Schema.Types.ObjectId[];
        meals: {
          breakfast?: Schema.Types.ObjectId;
          lunch?: Schema.Types.ObjectId;
          dinner?: Schema.Types.ObjectId;
        };
      }>;
    };
    accessibility?: {
      wheelchairAccess: boolean;
      mobilityAssistance: boolean;
      dietaryRestrictions: string[];
      medicalRequirements: string[];
    };
    budget?: {
      maxBudget: number;
      priorityAreas: string[];
      flexibleAreas: string[];
    };
  };
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const packageTemplateSchema = new Schema<PackageTemplateInterface>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    basePackageId: {
      type: Schema.Types.ObjectId,
      ref: "packages",
      required: true,
    },
    customizations: {
      accommodations: {
        hotelIds: [{ type: Schema.Types.ObjectId, ref: "hotels" }],
        preferences: {
          roomTypes: [String],
          amenities: [String],
          boardBasis: [String],
          location: [String],
        },
      },
      transportation: {
        type: {
          type: String,
          enum: ["Flight", "Train", "Bus", "Private Car", "None"],
        },
        preferences: {
          class: String,
          seatingPreference: String,
          specialAssistance: [String],
          luggageOptions: [String],
        },
      },
      activities: {
        included: [{ type: Schema.Types.ObjectId, ref: "activities" }],
        excluded: [{ type: Schema.Types.ObjectId, ref: "activities" }],
        preferences: {
          difficulty: [String],
          duration: [String],
          type: [String],
          timeOfDay: [String],
        },
      },
      meals: {
        included: {
          breakfast: Boolean,
          lunch: Boolean,
          dinner: Boolean,
        },
        preferences: {
          dietary: [String],
          cuisine: [String],
          mealTimes: {
            breakfast: String,
            lunch: String,
            dinner: String,
          },
        },
      },
      itinerary: {
        pace: {
          type: String,
          enum: ["Relaxed", "Moderate", "Fast"],
        },
        flexibility: {
          type: String,
          enum: ["Fixed", "Flexible", "Very Flexible"],
        },
        focusAreas: [String],
        customDays: [{
          day: Number,
          title: String,
          description: String,
          activities: [{ type: Schema.Types.ObjectId, ref: "activities" }],
          meals: {
            breakfast: { type: Schema.Types.ObjectId, ref: "restaurants" },
            lunch: { type: Schema.Types.ObjectId, ref: "restaurants" },
            dinner: { type: Schema.Types.ObjectId, ref: "restaurants" },
          },
        }],
      },
      accessibility: {
        wheelchairAccess: Boolean,
        mobilityAssistance: Boolean,
        dietaryRestrictions: [String],
        medicalRequirements: [String],
      },
      budget: {
        maxBudget: Number,
        priorityAreas: [String],
        flexibleAreas: [String],
      },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes
packageTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });
packageTemplateSchema.index({ tags: 1 });
packageTemplateSchema.index({ isPublic: 1 });
packageTemplateSchema.index({ createdAt: -1 });

const PackageTemplate = mongoose.model<PackageTemplateInterface>("PackageTemplate", packageTemplateSchema);

export default PackageTemplate;
