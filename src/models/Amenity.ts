import mongoose, { type Model, Schema } from "mongoose";
import { AmenityInterface } from "../utils/types";

const schema = new Schema<AmenityInterface>(
  {
    name: { type: String, required: true }, // e.g., "Wi-Fi", "Gym", "Pool"
    description: String,
  },
  {
    timestamps: true,
  }
);

let Amenity: Model<AmenityInterface>;
try {
  Amenity = mongoose.model<AmenityInterface>("amenities");
} catch (error) {
  Amenity = mongoose.model<AmenityInterface>("amenities", schema);
}

export default Amenity;
