import { type Model, Schema } from 'mongoose';
import mongoose from '~/utils/mongoose';
import { VehicleInterface } from '~/utils/types';

const schema = new Schema<VehicleInterface>(
  {
    vehicleType: { type: String, required: true }, // e.g., 'Car', 'SUV', 'Van'
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number },
    features: [String], // e.g., 'AC', 'GPS'
    capacity: { type: Number, required: true }, // Number of passengers
    pricePerDay: { type: Number, required: true },
    availability: {
      isAvailable: { type: Boolean, default: true },
      location: {
        city: { type: String, required: true },
        country: { type: String, required: true },
      },
    },
    ratings: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    images: [String], // URLs for vehicle images
    policies: { type: String }, // e.g., Rental policy
  },
  {
    timestamps: true,
  },
);

let Vehicle: Model<VehicleInterface>;
try {
  Vehicle = mongoose.model<VehicleInterface>('vehicles');
} catch (error) {
  Vehicle = mongoose.model<VehicleInterface>('vehicles', schema);
}

export default Vehicle;
