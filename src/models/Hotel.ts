import { type Model, Schema } from "mongoose";
import mongoose from "../mongoose";
import { HotelInterface } from "../utils/types";

const locationSchema = new Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
}, { _id: false });

const ratingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const roomSchema = new Schema({
  roomNumber: { type: String, required: true },
  floor: { type: Number, required: true },
  roomType: { type: String, required: true },
  pricePerNight: { type: Number, required: true },
  capacity: { type: Number, required: true },
  features: [String],
  isAvailable: { type: Boolean, default: true },
  maintenanceStatus: { 
    type: String,
    enum: ['Available', 'Cleaning', 'Maintenance'],
    default: 'Available'
  },
  images: [String]
}, { _id: true });

const schema = new Schema<HotelInterface>(
  {
    name: { 
      type: String, 
      required: true,
      index: true 
    },
    description: { type: String },
    location: { 
      type: locationSchema,
      required: true,
      index: '2dsphere' 
    },
    contactInfo: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
      website: String
    },
    starRating: { 
      type: Number, 
      required: true,
      min: 1,
      max: 5 
    },
    amenities: [String],
    checkInTime: { type: String, required: true },
    checkOutTime: { type: String, required: true },
    rooms: [roomSchema],
    images: [String],
    ratings: [ratingSchema],
    policies: {
      checkIn: { type: String, required: true },
      checkOut: { type: String, required: true },
      cancellation: { type: String, required: true },
      payment: { type: String, required: true },
      houseRules: [String]
    },
    seasonalPrices: [{
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      multiplier: { type: Number, required: true, min: 0 }
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
schema.index({ name: 'text', 'location.city': 'text', 'location.country': 'text' });
schema.index({ starRating: 1 });
schema.index({ 'rooms.pricePerNight': 1 });
schema.index({ 'rooms.capacity': 1 });
schema.index({ 'rooms.isAvailable': 1 });

// Virtuals
schema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

schema.virtual('availableRooms').get(function() {
  return this.rooms.filter(room => room.isAvailable && room.maintenanceStatus === 'Available');
});

// Middleware
schema.pre('save', function(next) {
  // Validate seasonal prices don't overlap
  const prices = this.seasonalPrices;
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      if (
        (prices[i].startDate <= prices[j].endDate && prices[i].endDate >= prices[j].startDate) ||
        (prices[j].startDate <= prices[i].endDate && prices[j].endDate >= prices[i].startDate)
      ) {
        next(new Error('Seasonal price periods cannot overlap'));
      }
    }
  }
  next();
});

// Methods
schema.methods.getCurrentPrice = function(roomType: string, date: Date = new Date()) {
  const room = this.rooms.find(r => r.roomType === roomType);
  if (!room) return null;

  const seasonalPrice = this.seasonalPrices.find(sp => 
    date >= sp.startDate && date <= sp.endDate
  );

  return seasonalPrice 
    ? room.pricePerNight * seasonalPrice.multiplier 
    : room.pricePerNight;
};

let Hotel: Model<HotelInterface>;
try {
  Hotel = mongoose.model<HotelInterface>("hotels");
} catch (error) {
  Hotel = mongoose.model<HotelInterface>("hotels", schema);
}

export default Hotel;
