import { Schema } from "mongoose";
import mongoose from "../mongoose";

export interface FavoriteInterface {
  userId: Schema.Types.ObjectId;
  itemId: Schema.Types.ObjectId;
  itemType: "hotel" | "vehicle" | "package";
  createdAt: Date;
}

const favoriteSchema = new Schema<FavoriteInterface>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    itemId: { type: Schema.Types.ObjectId, required: true },
    itemType: {
      type: String,
      required: true,
      enum: ["hotel", "vehicle", "package"],
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index to ensure a user can only favorite an item once
favoriteSchema.index({ userId: 1, itemId: 1, itemType: 1 }, { unique: true });

let Favorite: mongoose.Model<FavoriteInterface>;
try {
  Favorite = mongoose.model<FavoriteInterface>("favorites");
} catch (error) {
  Favorite = mongoose.model<FavoriteInterface>("favorites", favoriteSchema);
}

export default Favorite;
