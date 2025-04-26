import mongoose, { type Model, Schema } from "mongoose";
import { HotelInterface } from "../utils/types";

const locationSchema = new Schema(
  {
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    geo: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v: number[]) {
            return (
              v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 && // longitude
              v[1] >= -90 &&
              v[1] <= 90
            ); // latitude
          },
          message:
            "Coordinates must be [longitude, latitude] and within valid ranges",
        },
      },
    },
  },
  { _id: false }
);

const ratingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
  },
  { _id: true, timestamps: true }
);

const schema = new Schema<HotelInterface>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: { type: String },
    location: {
      type: locationSchema,
      required: true,
    },
    contactInfo: {
      phone: { type: String, required: false },
      email: { type: String, required: false },
      website: String,
    },
    starRating: {
      type: Number,
      required: false,
      min: 1,
      max: 5,
    },
    amenities: [String],
    checkInTime: { type: String, required: false },
    checkOutTime: { type: String, required: false },
    images: [String],
    ratings: [ratingSchema],
    policies: {
      checkIn: { type: String, required: false },
      checkOut: { type: String, required: false },
      cancellation: { type: String, required: false },
      payment: { type: String, required: false },
      houseRules: [String],
    },
    seasonalPrices: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        multiplier: { type: Number, required: true, min: 0 },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
schema.index({ "location.geo": "2dsphere" });
schema.index(
  {
    name: "text",
    "location.city": "text",
    "location.country": "text",
  },
  { weights: { name: 10, "location.city": 5, "location.country": 1 } }
);
schema.index({ starRating: 1 });

// Virtuals
schema.virtual("averageRating").get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

// Middleware
schema.pre("save", function (next) {
  // Validate seasonal prices don't overlap
  const prices = this.seasonalPrices;
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      if (
        (prices[i].startDate <= prices[j].endDate &&
          prices[i].endDate >= prices[j].startDate) ||
        (prices[j].startDate <= prices[i].endDate &&
          prices[j].endDate >= prices[i].startDate)
      ) {
        next(new Error("Seasonal price periods cannot overlap"));
      }
    }
  }
  next();
});

// Methods
schema.methods.getCurrentPrice = function (date: Date = new Date()) {
  const seasonalPrice = this.seasonalPrices.find(
    (sp) => date >= sp.startDate && date <= sp.endDate
  );

  return seasonalPrice ? seasonalPrice.multiplier : 1;
};

let Hotel: Model<HotelInterface>;
try {
  Hotel = mongoose.model<HotelInterface>("hotels");
} catch (error) {
  Hotel = mongoose.model<HotelInterface>("hotels", schema);
}

export default Hotel;
