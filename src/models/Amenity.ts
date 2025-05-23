import mongoose, { type Model, Schema, Document } from "mongoose";

/**
 * Interface for the Amenity document
 */
export interface AmenityInterface extends Document {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Amenity Schema - Represents hotel and property amenities
 */
const amenitySchema = new Schema<AmenityInterface>(
  {
    name: { 
      type: String, 
      required: [true, 'Amenity name is required'],
      trim: true,
      unique: true,
      index: true
    },
    description: { 
      type: String,
      trim: true
    },
    icon: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          // Basic URL validation for icon URLs
          return !v || /^(https?:\/\/|\/).+/.test(v);
        },
        message: 'Icon must be a valid URL or path'
      }
    },
    category: {
      type: String,
      trim: true,
      enum: {
        values: ['Basic', 'Premium', 'Accessibility', 'Safety', 'Entertainment', 'Business', 'Wellness'],
        message: '{VALUE} is not a valid amenity category'
      },
      default: 'Basic'
    },
    isPopular: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create text index for search
amenitySchema.index({ name: 'text', description: 'text' });

// Static methods

/**
 * Find amenities by category
 */
amenitySchema.statics.findByCategory = async function(category: string): Promise<AmenityInterface[]> {
  return this.find({ category }).sort({ name: 1 });
};

/**
 * Find popular amenities
 */
amenitySchema.statics.findPopular = async function(): Promise<AmenityInterface[]> {
  return this.find({ isPopular: true }).sort({ name: 1 });
};

// Create or retrieve the model
let Amenity: Model<AmenityInterface>;
try {
  Amenity = mongoose.model<AmenityInterface>("Amenity");
} catch (error) {
  Amenity = mongoose.model<AmenityInterface>("Amenity", amenitySchema);
}

export default Amenity;
