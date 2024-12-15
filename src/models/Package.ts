import { Schema } from "mongoose";
import mongoose from "../mongoose";

export interface PackageInterface {
  name: string;
  description?: string;
  price: number;
  images: string[];
  videos?: string[];
  duration: {
    days: number;
    nights: number;
  };
  destinations: Array<{
    destinationId: Schema.Types.ObjectId;
    order: number;
    stayDuration: number; // in days
  }>;
  hotels: Array<{
    hotelId: Schema.Types.ObjectId;
    roomTypes: string[];
    checkIn?: string;
    checkOut?: string;
  }>;
  activities: Array<{
    activityId: Schema.Types.ObjectId;
    day: number;
    timeSlot?: string;
  }>;
  transportation: {
    type: 'Flight' | 'Train' | 'Bus' | 'RentalCar' | 'Mixed';
    details: Array<{
      vehicleId?: Schema.Types.ObjectId;
      type: string;
      from: string;
      to: string;
      day: number;
    }>;
  };
  itinerary: Array<{
    day: number;
    title: string;
    description: string;
    meals: {
      breakfast?: boolean;
      lunch?: boolean;
      dinner?: boolean;
    };
  }>;
  included: string[];
  excluded: string[];
  terms: string[];
  maxParticipants?: number;
  minParticipants?: number;
  startDates?: Date[];
  seasonalPricing?: Array<{
    startDate: Date;
    endDate: Date;
    priceMultiplier: number;
  }>;
  status: 'Draft' | 'Active' | 'Inactive';
  sharing: {
    isPublic: boolean;
    sharedWith: Schema.Types.ObjectId[];
  };
  notes?: string;
  budget: {
    estimatedTotal: number;
    breakdown: {
      accommodation: number;
      transportation: number;
      activities: number;
      meals: number;
      others: number;
    };
  };
  meals: Array<{
    type: 'Breakfast' | 'Lunch' | 'Dinner';
    date: Date;
    venue: string;
    isIncluded: boolean;
    preferences: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<PackageInterface>(
  {
    name: {
      type: String,
      required: true,
      index: true
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: 0
    },
    images: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Image URL must be a valid URL"
      }
    }],
    videos: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Video URL must be a valid URL"
      }
    }],
    duration: {
      days: { type: Number, required: true, min: 1 },
      nights: { type: Number, required: true, min: 0 }
    },
    destinations: [{
      destinationId: { 
        type: Schema.Types.ObjectId, 
        ref: 'destinations', 
        required: true 
      },
      order: { 
        type: Number, 
        required: true,
        min: 1
      },
      stayDuration: { 
        type: Number, 
        required: true,
        min: 1
      }
    }],
    hotels: [{
      hotelId: { 
        type: Schema.Types.ObjectId, 
        ref: 'hotels', 
        required: true 
      },
      roomTypes: [{ 
        type: String, 
        required: true 
      }],
      checkIn: String,
      checkOut: String
    }],
    activities: [{
      activityId: { 
        type: Schema.Types.ObjectId, 
        ref: 'activities', 
        required: true 
      },
      day: { 
        type: Number, 
        required: true,
        min: 1
      },
      timeSlot: String
    }],
    transportation: {
      type: { 
        type: String, 
        enum: ['Flight', 'Train', 'Bus', 'RentalCar', 'Mixed'],
        required: true
      },
      details: [{
        vehicleId: { 
          type: Schema.Types.ObjectId, 
          ref: 'vehicles'
        },
        type: { 
          type: String, 
          required: true 
        },
        from: { 
          type: String, 
          required: true 
        },
        to: { 
          type: String, 
          required: true 
        },
        day: { 
          type: Number, 
          required: true,
          min: 1
        }
      }]
    },
    itinerary: [{
      day: { 
        type: Number, 
        required: true,
        min: 1
      },
      title: { 
        type: String, 
        required: true 
      },
      description: { 
        type: String, 
        required: true 
      },
      meals: {
        breakfast: Boolean,
        lunch: Boolean,
        dinner: Boolean
      }
    }],
    included: [String],
    excluded: [String],
    terms: [String],
    maxParticipants: {
      type: Number,
      min: 1
    },
    minParticipants: {
      type: Number,
      min: 1,
      validate: {
        validator: function(this: PackageInterface, v: number) {
          return !this.maxParticipants || v <= this.maxParticipants;
        },
        message: "Minimum participants cannot be greater than maximum participants"
      }
    },
    startDates: [{
      type: Date,
      validate: {
        validator: function(v: Date) {
          return v >= new Date();
        },
        message: "Start date must be in the future"
      }
    }],
    seasonalPricing: [{
      startDate: { 
        type: Date, 
        required: true 
      },
      endDate: { 
        type: Date, 
        required: true 
      },
      priceMultiplier: { 
        type: Number, 
        required: true,
        min: 0
      }
    }],
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Inactive'],
      default: 'Draft'
    },
    sharing: {
      isPublic: { type: Boolean, default: false },
      sharedWith: [{ type: Schema.Types.ObjectId, ref: 'users' }]
    },
    notes: String,
    budget: {
      estimatedTotal: { type: Number, required: true },
      breakdown: {
        accommodation: { type: Number, default: 0 },
        transportation: { type: Number, default: 0 },
        activities: { type: Number, default: 0 },
        meals: { type: Number, default: 0 },
        others: { type: Number, default: 0 }
      }
    },
    meals: [{
      type: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner'] },
      date: Date,
      venue: String,
      isIncluded: { type: Boolean, default: false },
      preferences: [String]
    }]
  },
  {
    timestamps: true
  }
);

// Create indexes for common queries
packageSchema.index({ name: 'text', description: 'text' });
packageSchema.index({ 'destinations.destinationId': 1 });
packageSchema.index({ price: 1, 'duration.days': 1 });
packageSchema.index({ status: 1, 'seasonalPricing.startDate': 1 });

let Package;
try {
  Package = mongoose.model('packages');
} catch (error) {
  Package = mongoose.model('packages', packageSchema);
}

export default Package;
