import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Interface for the Favorite document
 */
export interface FavoriteInterface extends Document {
  userId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  itemType: "hotel" | "vehicle" | "package" | "destination" | "activity";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getItem(): Promise<Document>;
}

/**
 * Favorite Schema - Represents user favorite items in the system
 */
const favoriteSchema = new Schema<FavoriteInterface>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: [true, 'User ID is required'],
      index: true
    },
    itemId: { 
      type: Schema.Types.ObjectId, 
      required: [true, 'Item ID is required'],
      index: true
    },
    itemType: {
      type: String,
      required: [true, 'Item type is required'],
      enum: {
        values: ["hotel", "vehicle", "package", "destination", "activity"],
        message: '{VALUE} is not a valid item type'
      },
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create a compound index to ensure a user can only favorite an item once
favoriteSchema.index(
  { userId: 1, itemId: 1, itemType: 1 }, 
  { unique: true, name: 'unique_user_favorite' }
);

// Methods

/**
 * Get the actual item that was favorited
 * @returns The favorited item document
 */
favoriteSchema.methods.getItem = async function(): Promise<Document> {
  let model;
  
  switch(this.itemType) {
    case 'hotel':
      model = 'Hotel';
      break;
    case 'vehicle':
      model = 'Vehicle';
      break;
    case 'package':
      model = 'Package';
      break;
    case 'destination':
      model = 'Destination';
      break;
    case 'activity':
      model = 'Activity';
      break;
    default:
      throw new Error(`Unknown item type: ${this.itemType}`);
  }
  
  return mongoose.model(model).findById(this.itemId);
};

// Statics

/**
 * Find favorites by user ID
 */
favoriteSchema.statics.findByUser = async function(userId: mongoose.Types.ObjectId): Promise<FavoriteInterface[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Find favorites by user ID and item type
 */
favoriteSchema.statics.findByUserAndType = async function(
  userId: mongoose.Types.ObjectId,
  itemType: string
): Promise<FavoriteInterface[]> {
  return this.find({ userId, itemType }).sort({ createdAt: -1 });
};

/**
 * Check if an item is favorited by a user
 */
favoriteSchema.statics.isFavorited = async function(
  userId: mongoose.Types.ObjectId,
  itemId: mongoose.Types.ObjectId,
  itemType: string
): Promise<boolean> {
  const count = await this.countDocuments({ userId, itemId, itemType });
  return count > 0;
};

/**
 * Get popular items by type and count
 */
favoriteSchema.statics.getPopularItems = async function(
  itemType: string,
  limit: number = 10
): Promise<any[]> {
  const results = await this.aggregate([
    { $match: { itemType } },
    { $group: { _id: "$itemId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
  
  // Return the actual items if needed
  const itemIds = results.map(r => r._id);
  let model;
  
  switch(itemType) {
    case 'hotel':
      model = 'Hotel';
      break;
    case 'vehicle':
      model = 'Vehicle';
      break;
    case 'package':
      model = 'Package';
      break;
    case 'destination':
      model = 'Destination';
      break;
    case 'activity':
      model = 'Activity';
      break;
    default:
      throw new Error(`Unknown item type: ${itemType}`);
  }
  
  const items = await mongoose.model(model).find({ _id: { $in: itemIds } });
  
  // Sort items by popularity count
  return items.sort((a, b) => {
    const aCount = results.find(r => r._id.equals(a._id))?.count || 0;
    const bCount = results.find(r => r._id.equals(b._id))?.count || 0;
    return bCount - aCount;
  });
};

// Create or retrieve the model
let Favorite: Model<FavoriteInterface>;
try {
  Favorite = mongoose.model<FavoriteInterface>("Favorite");
} catch (error) {
  Favorite = mongoose.model<FavoriteInterface>("Favorite", favoriteSchema);
}

export default Favorite;
