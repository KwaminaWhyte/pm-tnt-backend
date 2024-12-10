import { Schema } from "mongoose";
import { DestinationInterface } from "~/utils/types";
import mongoose from "../mongoose";

const schema = new Schema<DestinationInterface>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    highlights: [{
      type: String,
      trim: true,
    }],
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
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
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function(v: number[]) {
            return v.length === 2 && 
                   v[0] >= -180 && v[0] <= 180 && 
                   v[1] >= -90 && v[1] <= 90;
          },
          message: "Invalid coordinates. Must be [longitude, latitude] within valid ranges"
        }
      }
    },
    bestTimeToVisit: {
      startMonth: {
        type: Number,
        min: 1,
        max: 12,
        required: true,
      },
      endMonth: {
        type: Number,
        min: 1,
        max: 12,
        required: true,
      },
    },
    climate: {
      type: String,
      enum: ['Tropical', 'Dry', 'Temperate', 'Continental', 'Polar'],
      required: true,
    },
    popularActivities: [{
      type: String,
      trim: true,
    }],
    localCuisine: [{
      type: String,
      trim: true,
    }],
    culturalEvents: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      month: {
        type: Number,
        min: 1,
        max: 12,
        required: true,
      },
      description: String,
    }],
    rating: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
schema.index({ name: 1 });
schema.index({ country: 1, city: 1 });
schema.index({ location: '2dsphere' });
schema.index({ 'rating.average': -1 });
schema.index({ price: 1 });

let Destination: mongoose.Model<DestinationInterface>;
try {
  Destination = mongoose.model<DestinationInterface>("destinations");
} catch (error) {
  Destination = mongoose.model<DestinationInterface>("destinations", schema);
}

export default Destination;
