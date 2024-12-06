import { Schema } from "mongoose";
import { PackageInterface } from "~/utils/types";
import mongoose from "../mongoose";

const ItinerarySchema = new Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  activities: [{ type: String }],
});

const schema = new Schema<PackageInterface>(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    videos: [
      {
        type: String,
      },
    ],
    duration: {
      days: { type: Number, required: true },
      nights: { type: Number, required: true },
    },
    accommodations: [
      {
        type: String,
        required: true,
      },
    ],
    transportation: {
      type: String,
      enum: ["Flight", "Train", "Bus", "Private Car", "None"],
      required: true,
    },
    activities: [
      {
        type: String,
      },
    ],
    meals: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false },
    },
    itinerary: [ItinerarySchema],
    termsAndConditions: {
      type: String,
    },
    availability: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    rating: {
      average: { type: Number, min: 0, max: 5 },
      reviews: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

let Package: mongoose.Model<PackageInterface>;
try {
  Package = mongoose.model<PackageInterface>("packages");
} catch (error) {
  Package = mongoose.model<PackageInterface>("packages", schema);
}

export default Package;
