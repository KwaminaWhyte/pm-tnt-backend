import mongoose, { type Model, Schema } from "mongoose";
import { VehicleInterface } from "../utils/types";

const locationSchema = new Schema(
  {
    city: { type: String, required: true },
    country: { type: String, required: true },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  { _id: false }
);

const ratingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const insuranceSchema = new Schema(
  {
    provider: { type: String, required: true },
    policyNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    coverage: { type: String, required: true },
  },
  { _id: false }
);

const maintenanceHistorySchema = new Schema(
  {
    date: { type: Date, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    cost: { type: Number, required: true },
  },
  { _id: true }
);

const insuranceOptionSchema = new Schema(
  {
    type: { type: String, required: true },
    coverage: { type: String, required: true },
    pricePerDay: { type: Number, required: true },
  },
  { _id: false }
);

const schema = new Schema<VehicleInterface>(
  {
    vehicleType: {
      type: String,
      required: true,
      index: true,
    },
    make: {
      type: String,
      required: true,
      index: true,
    },
    model: {
      type: String,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    details: {
      color: { type: String, required: true },
      licensePlate: {
        type: String,
        required: true,
        unique: true,
      },
      transmission: {
        type: String,
        enum: ["Automatic", "Manual"],
        required: true,
      },
      fuelType: {
        type: String,
        enum: ["Petrol", "Diesel", "Electric", "Hybrid"],
        required: true,
      },
      mileage: { type: Number, required: true },
      vin: {
        type: String,
        required: true,
        unique: true,
      },
      insurance: insuranceSchema,
    },
    features: [String],
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
        index: true,
      },
      location: locationSchema,
    },
    maintenance: {
      lastService: { type: Date, required: true },
      nextService: { type: Date, required: true },
      status: {
        type: String,
        enum: ["Available", "In Service", "Repairs Needed"],
        default: "Available",
        index: true,
      },
      history: [maintenanceHistorySchema],
    },
    rentalTerms: {
      minimumAge: {
        type: Number,
        required: true,
        min: 18,
      },
      requiredDocuments: [String],
      securityDeposit: {
        type: Number,
        required: true,
        min: 0,
      },
      mileageLimit: {
        type: Number,
        required: true,
        min: 0,
      },
      additionalDrivers: {
        type: Boolean,
        default: false,
      },
      insuranceOptions: [insuranceOptionSchema],
    },
    ratings: [ratingSchema],
    images: [String],
    policies: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
schema.index({
  "availability.location.city": 1,
  "availability.location.country": 1,
});
schema.index({ pricePerDay: 1 });
schema.index({ capacity: 1 });

// Virtuals
schema.virtual("averageRating").get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

schema.virtual("maintenanceStatus").get(function () {
  if (!this.maintenance.nextService) return "Unknown";
  const today = new Date();
  const daysUntilService = Math.ceil(
    (this.maintenance.nextService.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (daysUntilService < 0) return "Overdue";
  if (daysUntilService <= 7) return "Due Soon";
  return "OK";
});

schema.virtual("totalMaintenanceCost").get(function () {
  return this.maintenance.history.reduce((acc, curr) => acc + curr.cost, 0);
});

// Middleware
schema.pre("save", function (next) {
  // Validate maintenance dates
  if (this.maintenance.lastService >= this.maintenance.nextService) {
    next(new Error("Next service date must be after last service date"));
  }

  // Validate insurance expiry
  if (this.details.insurance.expiryDate <= new Date()) {
    next(new Error("Insurance has expired"));
  }

  next();
});

// Methods
schema.methods.isAvailableForDates = function (
  startDate: Date,
  endDate: Date
): boolean {
  return (
    this.availability.isAvailable &&
    this.maintenance.status === "Available" &&
    (!this.maintenance.nextService || this.maintenance.nextService > endDate)
  );
};

schema.methods.calculateRentalPrice = function (
  days: number,
  insuranceOption?: string
): {
  basePrice: number;
  insuranceCost: number;
  totalPrice: number;
} {
  const basePrice = this.pricePerDay * days;
  let insuranceCost = 0;

  if (insuranceOption) {
    const insurance = this.rentalTerms.insuranceOptions.find(
      (i) => i.type === insuranceOption
    );
    if (insurance) {
      insuranceCost = insurance.pricePerDay * days;
    }
  }

  return {
    basePrice,
    insuranceCost,
    totalPrice: basePrice + insuranceCost,
  };
};

let Vehicle: Model<VehicleInterface>;
try {
  Vehicle = mongoose.model<VehicleInterface>("vehicles");
} catch (error) {
  Vehicle = mongoose.model<VehicleInterface>("vehicles", schema);
}

export default Vehicle;
