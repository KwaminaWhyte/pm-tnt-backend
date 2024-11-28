import { type Model, Schema } from "mongoose";
import mongoose from "~/utils/mongoose";
import { HotelInterface } from "~/utils/types";

const schema = new Schema<HotelInterface>(
  {
    name: { type: String, required: true },
    location: { 
        address: { type: String, required: true },
        city: { type: String, required: true },
        country: { type: String, required: true },
        coordinates: { 
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        }
    },
    description: { type: String },
    amenities: [String], // e.g., 'WiFi', 'Swimming Pool'
    rooms: [{
        roomType: { type: String, required: true }, // e.g., 'Single', 'Double'
        pricePerNight: { type: Number, required: true },
        capacity: { type: Number, required: true }, // Number of guests
        features: [String], // e.g., 'AC', 'TV'
        isAvailable: { type: Boolean, default: true }
    }],
    images: [String], // URLs for images
    ratings: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    policies: { type: String } // e.g., Cancellation policy
  },
  { timestamps: true }
);

let Hotel: Model<HotelInterface>;
try {
  Hotel = mongoose.model<HotelInterface>("hotels");
} catch (error) {
  Hotel = mongoose.model<HotelInterface>("hotels", schema);
}

export default Hotel;
