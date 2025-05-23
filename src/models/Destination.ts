import mongoose, { Schema, Model, Document } from "mongoose";

/**
 * Cultural Event Schema - Represents cultural events at a destination
 */
interface CulturalEvent {
  name: string;
  description: string;
  date?: {
    month: number;
    day?: number;
  };
}

/**
 * Related Destination Schema - Represents relationships between destinations
 */
interface RelatedDestination {
  destinationId: mongoose.Types.ObjectId;
  relationshipType: "NearBy" | "SimilarClimate" | "PopularCombination";
}

/**
 * Seasonal Pricing Schema - Represents price variations by season
 */
interface SeasonalPricing {
  startMonth: number;
  endMonth: number;
  priceMultiplier: number;
}

/**
 * Interface for the Destination document
 */
export interface DestinationInterface extends Document {
  name: string;
  country: string;
  city: string;
  description: string;
  shortDescription?: string;
  highlights: string[];
  price: number;
  discount?: number;
  images: string[];
  featuredImage?: string;
  location: {
    type: string;
    coordinates: number[];
  };
  bestTimeToVisit: {
    startMonth: number;
    endMonth: number;
    notes?: string;
  };
  climate: "Tropical" | "Dry" | "Temperate" | "Continental" | "Polar";
  popularActivities: string[];
  localCuisine: string[];
  culturalEvents: CulturalEvent[];
  relatedDestinations: RelatedDestination[];
  seasonalPricing: SeasonalPricing[];
  travelTips: string[];
  visaRequirements?: string;
  languages: string[];
  currency: string;
  timeZone: string;
  status: "Active" | "Inactive" | "Seasonal";
  isActive: boolean;
  popularity?: number;
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getCurrentPrice(): number;
  isInPeakSeason(date?: Date): boolean;
  getRelatedDestinations(): Promise<DestinationInterface[]>;
}

/**
 * Cultural Event Schema
 */
const culturalEventSchema = new Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Event name is required'],
      trim: true
    },
    description: { 
      type: String, 
      required: [true, 'Event description is required'],
      trim: true
    },
    date: {
      month: { 
        type: Number, 
        min: [1, 'Month must be between 1 and 12'],
        max: [12, 'Month must be between 1 and 12']
      },
      day: { 
        type: Number, 
        min: [1, 'Day must be between 1 and 31'],
        max: [31, 'Day must be between 1 and 31']
      },
    },
  },
  { _id: true }
);

/**
 * Related Destination Schema
 */
const relatedDestinationSchema = new Schema(
  {
    destinationId: { 
      type: Schema.Types.ObjectId, 
      ref: "Destination",
      required: [true, 'Destination ID is required']
    },
    relationshipType: {
      type: String,
      enum: {
        values: ["NearBy", "SimilarClimate", "PopularCombination"],
        message: '{VALUE} is not a valid relationship type'
      },
      required: [true, 'Relationship type is required']
    },
  },
  { _id: true }
);

/**
 * Seasonal Pricing Schema
 */
const seasonalPricingSchema = new Schema(
  {
    startMonth: { 
      type: Number, 
      required: [true, 'Start month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    endMonth: { 
      type: Number, 
      required: [true, 'End month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    priceMultiplier: { 
      type: Number, 
      required: [true, 'Price multiplier is required'],
      min: [0, 'Price multiplier must be non-negative']
    },
  },
  { _id: true }
);

/**
 * Destination Schema - Represents travel destinations in the system
 */
const destinationSchema = new Schema<DestinationInterface>(
  {
    name: { 
      type: String, 
      required: [true, 'Destination name is required'],
      trim: true,
      index: true
    },
    country: { 
      type: String, 
      required: [true, 'Country is required'],
      trim: true,
      index: true
    },
    city: { 
      type: String, 
      required: [true, 'City is required'],
      trim: true,
      index: true
    },
    description: { 
      type: String, 
      required: [true, 'Description is required'],
      trim: true
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, 'Short description cannot exceed 200 characters']
    },
    highlights: { 
      type: [String], 
      default: [] 
    },
    price: { 
      type: Number, 
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
      index: true
    },
    discount: { 
      type: Number,
      min: [0, 'Discount must be non-negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) =>
          v.every((url) => /^https?:\/\/.+/.test(url)),
        message: 'Image URL must be a valid URL',
      },
    },
    featuredImage: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Featured image must be a valid URL',
      },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: [true, 'Location type is required'],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
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
            'Invalid coordinates. Must be [longitude, latitude] within valid ranges',
        },
      },
    },
    bestTimeToVisit: {
      startMonth: { 
        type: Number, 
        required: [true, 'Start month is required'],
        min: [1, 'Month must be between 1 and 12'],
        max: [12, 'Month must be between 1 and 12']
      },
      endMonth: { 
        type: Number, 
        required: [true, 'End month is required'],
        min: [1, 'Month must be between 1 and 12'],
        max: [12, 'Month must be between 1 and 12']
      },
      notes: {
        type: String,
        trim: true
      }
    },
    climate: {
      type: String,
      required: [true, 'Climate is required'],
      enum: {
        values: ["Tropical", "Dry", "Temperate", "Continental", "Polar"],
        message: '{VALUE} is not a valid climate type'
      },
      index: true
    },
    popularActivities: { 
      type: [String], 
      default: [] 
    },
    localCuisine: { 
      type: [String], 
      default: [] 
    },
    culturalEvents: [culturalEventSchema],
    relatedDestinations: [relatedDestinationSchema],
    seasonalPricing: [seasonalPricingSchema],
    travelTips: { 
      type: [String], 
      default: [] 
    },
    visaRequirements: {
      type: String,
      trim: true
    },
    languages: { 
      type: [String], 
      required: [true, 'Languages are required'] 
    },
    currency: { 
      type: String, 
      required: [true, 'Currency is required'],
      trim: true
    },
    timeZone: { 
      type: String, 
      required: [true, 'Time zone is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive", "Seasonal"],
        message: '{VALUE} is not a valid status'
      },
      default: "Active",
      index: true
    },
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    popularity: {
      type: Number,
      min: [0, 'Popularity must be non-negative'],
      max: [10, 'Popularity cannot exceed 10'],
      default: 0
    },
    rating: {
      type: Number,
      min: [0, 'Rating must be non-negative'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0
    },
    reviewCount: {
      type: Number,
      min: [0, 'Review count must be non-negative'],
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance optimization
destinationSchema.index({ location: "2dsphere" });
destinationSchema.index({ name: "text", description: "text", "city": "text", "country": "text" });
destinationSchema.index({ price: 1, "bestTimeToVisit.startMonth": 1 });
destinationSchema.index({ country: 1, city: 1 });
destinationSchema.index({ popularity: -1 });
destinationSchema.index({ rating: -1 });

// Virtuals
destinationSchema.virtual('discountedPrice').get(function() {
  if (!this.discount) return this.price;
  return this.price * (1 - this.discount / 100);
});

destinationSchema.virtual('hasDiscount').get(function() {
  return !!this.discount && this.discount > 0;
});

destinationSchema.virtual('isFeatured').get(function() {
  return this.popularity >= 8;
});

// Methods

/**
 * Get the current price based on seasonal pricing
 * @returns The calculated current price
 */
destinationSchema.methods.getCurrentPrice = function(): number {
  const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
  const basePrice = this.discountedPrice || this.price;
  
  // Check if there's a seasonal price for the current month
  const seasonalPricing = this.seasonalPricing.find(season => {
    if (season.startMonth <= season.endMonth) {
      // Normal range (e.g., April to October)
      return currentMonth >= season.startMonth && currentMonth <= season.endMonth;
    } else {
      // Wrapped range (e.g., November to February)
      return currentMonth >= season.startMonth || currentMonth <= season.endMonth;
    }
  });
  
  if (seasonalPricing) {
    return basePrice * seasonalPricing.priceMultiplier;
  }
  
  return basePrice;
};

/**
 * Check if the destination is currently in peak season
 * @param date - Optional date to check, defaults to current date
 * @returns Whether the destination is in peak season
 */
destinationSchema.methods.isInPeakSeason = function(date?: Date): boolean {
  const checkDate = date || new Date();
  const month = checkDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  const { startMonth, endMonth } = this.bestTimeToVisit;
  
  if (startMonth <= endMonth) {
    // Normal range (e.g., April to October)
    return month >= startMonth && month <= endMonth;
  } else {
    // Wrapped range (e.g., November to February)
    return month >= startMonth || month <= endMonth;
  }
};

/**
 * Get related destinations as full documents
 * @returns Array of related destination documents
 */
destinationSchema.methods.getRelatedDestinations = async function(): Promise<DestinationInterface[]> {
  if (!this.relatedDestinations || this.relatedDestinations.length === 0) {
    return [];
  }
  
  const destinationIds = this.relatedDestinations.map(rel => rel.destinationId);
  return this.model('Destination').find({ _id: { $in: destinationIds } });
};

// Statics

/**
 * Find destinations by country
 */
destinationSchema.statics.findByCountry = async function(country: string): Promise<DestinationInterface[]> {
  return this.find({ country, isActive: true }).sort({ popularity: -1 });
};

/**
 * Find destinations by climate
 */
destinationSchema.statics.findByClimate = async function(climate: string): Promise<DestinationInterface[]> {
  return this.find({ climate, isActive: true }).sort({ popularity: -1 });
};

/**
 * Find featured destinations
 */
destinationSchema.statics.findFeatured = async function(limit: number = 10): Promise<DestinationInterface[]> {
  return this.find({ isActive: true })
    .sort({ popularity: -1, rating: -1 })
    .limit(limit);
};

// Create or retrieve the model
let Destination: Model<DestinationInterface>;
try {
  Destination = mongoose.model<DestinationInterface>("Destination");
} catch (error) {
  Destination = mongoose.model<DestinationInterface>("Destination", destinationSchema);
}

export default Destination;
