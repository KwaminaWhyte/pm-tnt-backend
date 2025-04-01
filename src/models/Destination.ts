import mongoose, { Schema, Model } from "mongoose";

export interface DestinationInterface {
  name: string;
  country: string;
  city: string;
  description: string;
  highlights: string[];
  price: number;
  discount?: number;
  images: string[];
  location: {
    type: string;
    coordinates: number[];
  };
  bestTimeToVisit: {
    startMonth: number;
    endMonth: number;
  };
  climate: "Tropical" | "Dry" | "Temperate" | "Continental" | "Polar";
  popularActivities: string[];
  localCuisine: string[];
  culturalEvents: Array<{
    name: string;
    description: string;
    date?: {
      month: number;
      day?: number;
    };
  }>;
  relatedDestinations: Array<{
    destinationId: Schema.Types.ObjectId;
    relationshipType: "NearBy" | "SimilarClimate" | "PopularCombination";
  }>;
  seasonalPricing: Array<{
    startMonth: number;
    endMonth: number;
    priceMultiplier: number;
  }>;
  travelTips: string[];
  visaRequirements?: string;
  languages: string[];
  currency: string;
  timeZone: string;
  status: "Active" | "Inactive" | "Seasonal";
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<DestinationInterface>(
  {
    name: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String, required: true },
    highlights: { type: [String], default: [] },
    price: { type: Number, required: true },
    discount: Number,
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) =>
          v.every((url) => /^https?:\/\/.+/.test(url)),
        message: "Image URL must be a valid URL",
      },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v: number[]) => {
            return (
              v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 && // longitude
              v[1] >= -90 &&
              v[1] <= 90 // latitude
            );
          },
          message:
            "Invalid coordinates. Must be [longitude, latitude] within valid ranges",
        },
      },
    },
    bestTimeToVisit: {
      startMonth: { type: Number, required: true, min: 1, max: 12 },
      endMonth: { type: Number, required: true, min: 1, max: 12 },
    },
    climate: {
      type: String,
      required: true,
      enum: ["Tropical", "Dry", "Temperate", "Continental", "Polar"],
    },
    popularActivities: { type: [String], default: [] },
    localCuisine: { type: [String], default: [] },
    culturalEvents: {
      type: [
        {
          name: { type: String, required: true },
          description: { type: String, required: true },
          date: {
            month: { type: Number, min: 1, max: 12 },
            day: { type: Number, min: 1, max: 31 },
          },
        },
      ],
      default: [],
    },
    relatedDestinations: {
      type: [
        {
          destinationId: { type: Schema.Types.ObjectId, ref: "destinations" },
          relationshipType: {
            type: String,
            enum: ["NearBy", "SimilarClimate", "PopularCombination"],
          },
        },
      ],
      default: [],
    },
    seasonalPricing: {
      type: [
        {
          startMonth: { type: Number, required: true, min: 1, max: 12 },
          endMonth: { type: Number, required: true, min: 1, max: 12 },
          priceMultiplier: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    travelTips: { type: [String], default: [] },
    visaRequirements: String,
    languages: { type: [String], required: true },
    currency: { type: String, required: true },
    timeZone: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Seasonal"],
      default: "Active",
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
schema.index({ location: "2dsphere" });
schema.index({ name: "text", description: "text" });
schema.index({ price: 1, "bestTimeToVisit.startMonth": 1 });
schema.index({ country: 1, city: 1 });

const Destination: Model<DestinationInterface> =
  mongoose.models.destinations ||
  mongoose.model<DestinationInterface>("destinations", schema);

export default Destination;
