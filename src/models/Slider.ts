import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Interface for the Slider document
 */
export interface SliderInterface extends Document {
  title: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  mobileImageUrl?: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundColor?: string;
  textColor?: string;
  position?: "left" | "center" | "right";
  order: number;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  targetAudience?: string[];
  viewCount?: number;
  clickCount?: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  incrementViewCount(): Promise<SliderInterface>;
  incrementClickCount(): Promise<SliderInterface>;
  isCurrentlyActive(): boolean;
}

/**
 * Slider Schema - Represents slider/banner items in the system
 */
const sliderSchema = new Schema<SliderInterface>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
      index: true
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [200, "Subtitle cannot exceed 200 characters"]
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Image URL must be a valid URL"
      }
    },
    mobileImageUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Mobile image URL must be a valid URL"
      }
    },
    ctaText: {
      type: String,
      required: [true, "CTA text is required"],
      trim: true,
      maxlength: [50, "CTA text cannot exceed 50 characters"]
    },
    ctaLink: {
      type: String,
      required: [true, "CTA link is required"],
      trim: true,
      validate: {
        validator: function(v: string) {
          // Allow both absolute URLs and relative paths
          return /^(\/|https?:\/\/).+/.test(v);
        },
        message: "CTA link must be a valid URL or path"
      }
    },
    secondaryCtaText: {
      type: String,
      trim: true,
      maxlength: [50, "Secondary CTA text cannot exceed 50 characters"]
    },
    secondaryCtaLink: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^(\/|https?:\/\/).+/.test(v);
        },
        message: "Secondary CTA link must be a valid URL or path"
      }
    },
    backgroundColor: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Background color must be a valid hex color code"
      }
    },
    textColor: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Text color must be a valid hex color code"
      }
    },
    position: {
      type: String,
      enum: {
        values: ["left", "center", "right"],
        message: "{VALUE} is not a valid position"
      },
      default: "center"
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    startDate: {
      type: Date,
      validate: {
        validator: function(this: any, v: Date) {
          if (this.endDate && v > this.endDate) {
            return false;
          }
          return true;
        },
        message: "Start date must be before end date"
      }
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(this: any, v: Date) {
          if (this.startDate && v < this.startDate) {
            return false;
          }
          return true;
        },
        message: "End date must be after start date"
      }
    },
    targetAudience: [{
      type: String,
      trim: true
    }],
    viewCount: {
      type: Number,
      default: 0,
      min: [0, "View count cannot be negative"]
    },
    clickCount: {
      type: Number,
      default: 0,
      min: [0, "Click count cannot be negative"]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance optimization
sliderSchema.index({ order: 1, isActive: 1 });
sliderSchema.index({ startDate: 1, endDate: 1 });

// Virtuals
sliderSchema.virtual('clickThroughRate').get(function() {
  if (!this.viewCount || this.viewCount === 0) return 0;
  return Math.round((this.clickCount / this.viewCount) * 10000) / 100; // Returns percentage with 2 decimal places
});

// Methods

/**
 * Check if the slider is currently active based on dates
 */
sliderSchema.methods.isCurrentlyActive = function(): boolean {
  const now = new Date();
  
  // If no date constraints, just check isActive flag
  if (!this.startDate && !this.endDate) return this.isActive;
  
  // Check start date if it exists
  if (this.startDate && now < this.startDate) return false;
  
  // Check end date if it exists
  if (this.endDate && now > this.endDate) return false;
  
  return this.isActive;
};

/**
 * Increment the view count
 */
sliderSchema.methods.incrementViewCount = async function(): Promise<SliderInterface> {
  this.viewCount = (this.viewCount || 0) + 1;
  return this.save();
};

/**
 * Increment the click count
 */
sliderSchema.methods.incrementClickCount = async function(): Promise<SliderInterface> {
  this.clickCount = (this.clickCount || 0) + 1;
  return this.save();
};

// Statics

/**
 * Find active sliders
 */
sliderSchema.statics.findActive = async function(): Promise<SliderInterface[]> {
  const now = new Date();
  return this.find({
    isActive: true,
    $and: [
      { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] }
    ]
  }).sort({ order: 1 });
};

// Create or retrieve the model
let Slider: Model<SliderInterface>;
try {
  Slider = mongoose.model<SliderInterface>("Slider");
} catch (error) {
  Slider = mongoose.model<SliderInterface>("Slider", sliderSchema);
}

export default Slider;
