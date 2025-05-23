import mongoose, { type Model, Schema, Document } from "mongoose";

/**
 * Interface for FAQ categories
 */
type FaqCategoryType = "general" | "booking" | "payment" | "cancellation" | "hotels" | "vehicles" | "packages" | "account" | "other";

/**
 * Interface for FAQ Model
 */
interface FaqModel extends Model<FaqInterface> {
  findByCategory(category: FaqCategoryType): Promise<FaqInterface[]>;
  findPopular(limit?: number): Promise<FaqInterface[]>;
  search(query: string): Promise<FaqInterface[]>;
}

/**
 * Interface for FAQ Document
 */
export interface FaqInterface extends Document {
  question: string;
  answer: string;
  description?: string;
  category: FaqCategoryType;
  tags?: string[];
  order?: number;
  isPublished: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  incrementViewCount(): Promise<FaqInterface>;
  markAsHelpful(): Promise<FaqInterface>;
  markAsNotHelpful(): Promise<FaqInterface>;
  publish(): Promise<FaqInterface>;
  unpublish(): Promise<FaqInterface>;
}

/**
 * Schema for FAQ
 */
const faqSchema = new Schema<FaqInterface>(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      unique: true,
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters'],
      index: true
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      minlength: [10, 'Answer must be at least 10 characters long'],
      maxlength: [5000, 'Answer cannot exceed 5000 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ["general", "booking", "payment", "cancellation", "hotels", "vehicles", "packages", "account", "other"],
        message: '{VALUE} is not a valid FAQ category'
      },
      default: 'general',
      index: true
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return /^[\w-]+$/.test(v);
        },
        message: 'Tags must contain only letters, numbers, underscores, and hyphens'
      }
    }],
    order: {
      type: Number,
      default: 0,
      min: [0, 'Order must be non-negative']
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    },
    viewCount: {
      type: Number,
      default: 0,
      min: [0, 'View count cannot be negative']
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: [0, 'Helpful count cannot be negative']
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
      min: [0, 'Not helpful count cannot be negative']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance optimization
faqSchema.index({ category: 1, order: 1 });
faqSchema.index({ tags: 1 });
faqSchema.index({ createdAt: -1 });

// Virtual for helpfulness ratio
faqSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (total === 0) return 0;
  return (this.helpfulCount / total) * 100;
});

// Text index for search
faqSchema.index({ question: 'text', answer: 'text', description: 'text' });

// Methods

/**
 * Increment view count
 */
faqSchema.methods.incrementViewCount = async function(): Promise<FaqInterface> {
  this.viewCount += 1;
  return this.save();
};

/**
 * Mark FAQ as helpful
 */
faqSchema.methods.markAsHelpful = async function(): Promise<FaqInterface> {
  this.helpfulCount += 1;
  return this.save();
};

/**
 * Mark FAQ as not helpful
 */
faqSchema.methods.markAsNotHelpful = async function(): Promise<FaqInterface> {
  this.notHelpfulCount += 1;
  return this.save();
};

/**
 * Publish FAQ
 */
faqSchema.methods.publish = async function(): Promise<FaqInterface> {
  this.isPublished = true;
  return this.save();
};

/**
 * Unpublish FAQ
 */
faqSchema.methods.unpublish = async function(): Promise<FaqInterface> {
  this.isPublished = false;
  return this.save();
};

// Statics

/**
 * Find FAQs by category
 * @param category - Category to search for
 */
faqSchema.statics.findByCategory = async function(category: FaqCategoryType): Promise<FaqInterface[]> {
  return this.find({ category, isPublished: true })
    .sort({ order: 1, createdAt: -1 });
};

/**
 * Find popular FAQs
 * @param limit - Maximum number of FAQs to return
 */
faqSchema.statics.findPopular = async function(limit: number = 10): Promise<FaqInterface[]> {
  return this.find({ isPublished: true })
    .sort({ viewCount: -1, helpfulCount: -1 })
    .limit(limit);
};

/**
 * Search FAQs
 * @param query - Search query
 */
faqSchema.statics.search = async function(query: string): Promise<FaqInterface[]> {
  return this.find(
    { 
      isPublished: true,
      $text: { $search: query } 
    },
    { 
      score: { $meta: 'textScore' } 
    }
  ).sort({ score: { $meta: 'textScore' } });
};

// Create or retrieve the model
let Faq: FaqModel;
try {
  Faq = mongoose.model<FaqInterface, FaqModel>("Faq");
} catch (error) {
  Faq = mongoose.model<FaqInterface, FaqModel>("Faq", faqSchema);
}

export default Faq;
