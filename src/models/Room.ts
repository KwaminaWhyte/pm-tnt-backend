import mongoose, { type Model, Schema } from "mongoose";
import { HotelInterface } from "../utils/types";

const schema = new Schema(
  {
    hotel: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    roomNumber: { type: String, required: true },
    floor: { type: Number, required: true },
    roomType: { type: String, required: true },
    pricePerNight: { type: Number, required: true },
    capacity: { type: Number, required: true },
    features: [String],
    isAvailable: { type: Boolean, default: true },
    maintenanceStatus: {
      type: String,
      enum: ["Available", "Cleaning", "Maintenance"],
      default: "Available",
    },
    images: [String],
  },
  { timestamps: true }
);

let Room: Model<HotelInterface>;
try {
  Room = mongoose.model<HotelInterface>("rooms");
} catch (error) {
  Room = mongoose.model<HotelInterface>("rooms", schema);
}

export default Room;
