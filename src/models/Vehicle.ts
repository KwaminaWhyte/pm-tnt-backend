import mongoose, { type Model, Schema, Document } from "mongoose";
import { VehicleInterface } from "~/utils/types";

/**
 * Location Schema - Represents a physical location with coordinates
 */
const locationSchema = new Schema(
  {
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"],
      },
      longitude: {
        type: Number,
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"],
      },
    },
  },
  { _id: false }
);

/**
 * Rating Schema - Represents a user rating for a vehicle
 */
const ratingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Insurance Schema - Represents vehicle insurance details
 */
const insuranceSchema = new Schema(
  {
    provider: {
      type: String,
      required: [true, "Insurance provider is required"],
      trim: true,
    },
    policyNumber: {
      type: String,
      required: [true, "Policy number is required"],
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    coverage: {
      type: String,
      required: [true, "Coverage details are required"],
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Maintenance History Schema - Represents a vehicle maintenance record
 */
const maintenanceHistorySchema = new Schema(
  {
    date: {
      type: Date,
      required: [true, "Maintenance date is required"],
    },
    type: {
      type: String,
      required: [true, "Maintenance type is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Maintenance description is required"],
      trim: true,
    },
    cost: {
      type: Number,
      required: [true, "Maintenance cost is required"],
      min: [0, "Cost must be non-negative"],
    },
  },
  { _id: true, timestamps: true }
);

/**
 * Insurance Option Schema - Represents an insurance option for rental
 */
const insuranceOptionSchema = new Schema(
  {
    type: {
      type: String,
      required: [true, "Insurance type is required"],
      trim: true,
    },
    coverage: {
      type: String,
      required: [true, "Coverage details are required"],
      trim: true,
    },
    pricePerDay: {
      type: Number,
      required: [true, "Price per day is required"],
      min: [0, "Price must be non-negative"],
    },
  },
  { _id: false }
);

/**
 * Vehicle Schema - Represents a vehicle in the system
 *
 * @remarks
 * Vehicles have details, availability status, maintenance records, and rental terms
 */
const vehicleSchema = new Schema<VehicleInterface & Document>(
  {
    vehicleType: {
      type: String,
      required: [true, "Vehicle type is required"],
      trim: true,
      index: true,
    },
    make: {
      type: String,
      required: [true, "Make is required"],
      trim: true,
      index: true,
    },
    model: {
      type: String,
      required: [true, "Model is required"],
      trim: true,
      index: true,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [1900, "Year must be 1900 or later"],
      max: [new Date().getFullYear() + 1, "Year cannot be in the future"],
    },
    details: {
      color: {
        type: String,
        required: [true, "Color is required"],
        trim: true,
      },
      licensePlate: {
        type: String,
        required: [true, "License plate is required"],
        unique: true,
        trim: true,
        uppercase: true,
      },
      transmission: {
        type: String,
        enum: {
          values: ["Automatic", "Manual"],
          message: "{VALUE} is not a valid transmission type",
        },
        required: [true, "Transmission type is required"],
      },
      fuelType: {
        type: String,
        enum: {
          values: ["Petrol", "Diesel", "Electric", "Hybrid"],
          message: "{VALUE} is not a valid fuel type",
        },
        required: [true, "Fuel type is required"],
      },
      mileage: {
        type: Number,
        required: [true, "Mileage is required"],
        min: [0, "Mileage must be non-negative"],
      },
      vin: {
        type: String,
        required: [true, "VIN is required"],
        unique: true,
        trim: true,
        uppercase: true,
      },
      insurance: insuranceSchema,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    pricePerDay: {
      type: Number,
      required: [true, "Price per day is required"],
      min: [0, "Price must be non-negative"],
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
      lastService: {
        type: Date,
        required: [true, "Last service date is required"],
      },
      nextService: {
        type: Date,
        required: [true, "Next service date is required"],
      },
      status: {
        type: String,
        enum: {
          values: ["Available", "In Service", "Repairs Needed"],
          message: "{VALUE} is not a valid maintenance status",
        },
        default: "Available",
        index: true,
      },
      history: [maintenanceHistorySchema],
    },
    rentalTerms: {
      minimumAge: {
        type: Number,
        required: [true, "Minimum age is required"],
        min: [18, "Minimum age must be at least 18"],
      },
      requiredDocuments: [
        {
          type: String,
          trim: true,
        },
      ],
      securityDeposit: {
        type: Number,
        required: [true, "Security deposit is required"],
        min: [0, "Security deposit must be non-negative"],
      },
      mileageLimit: {
        type: Number,
        required: [true, "Mileage limit is required"],
        min: [0, "Mileage limit must be non-negative"],
      },
      additionalDrivers: {
        type: Boolean,
        default: false,
      },
      insuranceOptions: [insuranceOptionSchema],
    },
    ratings: [ratingSchema],
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    policies: {
      type: String,
      required: [true, "Policies are required"],
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
vehicleSchema.index({
  "availability.location.city": 1,
  "availability.location.country": 1,
});
vehicleSchema.index({ pricePerDay: 1 });
vehicleSchema.index({ capacity: 1 });
vehicleSchema.index({ year: 1 });
vehicleSchema.index({ "details.fuelType": 1 });
vehicleSchema.index({ "details.transmission": 1 });

// Virtuals
vehicleSchema.virtual("averageRating").get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

vehicleSchema.virtual("maintenanceStatus").get(function () {
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

vehicleSchema.virtual("totalMaintenanceCost").get(function () {
  if (!this.maintenance.history || this.maintenance.history.length === 0)
    return 0;
  return this.maintenance.history.reduce((acc, curr) => acc + curr.cost, 0);
});

// Middleware
vehicleSchema.pre("save", function (next) {
  // Validate maintenance dates
  if (this.maintenance.lastService >= this.maintenance.nextService) {
    return next(new Error("Next service date must be after last service date"));
  }

  // Validate insurance expiry
  if (this.details.insurance.expiryDate <= new Date()) {
    return next(new Error("Insurance has expired"));
  }

  next();
});

/**
 * Check if the vehicle is available for the specified date range
 * @param startDate - The rental start date
 * @param endDate - The rental end date
 * @returns Whether the vehicle is available for the specified dates
 */
vehicleSchema.methods.isAvailableForDates = function (
  startDate: Date,
  endDate: Date
): boolean {
  return (
    this.availability.isAvailable &&
    this.maintenance.status === "Available" &&
    (!this.maintenance.nextService || this.maintenance.nextService > endDate)
  );
};

/**
 * Calculate the rental price for the specified number of days
 * @param days - The number of rental days
 * @param insuranceOption - Optional insurance option type
 * @returns Object containing basePrice, insuranceCost, and totalPrice
 */
vehicleSchema.methods.calculateRentalPrice = function (
  days: number,
  insuranceOption?: string
): {
  basePrice: number;
  insuranceCost: number;
  totalPrice: number;
} {
  const basePrice = this.pricePerDay * days;
  let insuranceCost = 0;

  if (insuranceOption && this.rentalTerms.insuranceOptions) {
    const insurance = this.rentalTerms.insuranceOptions.find(
      (i: { type: string; pricePerDay: number }) => i.type === insuranceOption
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

// Create or retrieve the model
let Vehicle: Model<VehicleInterface & Document>;
try {
  Vehicle = mongoose.model<VehicleInterface & Document>("Vehicle");
} catch (error) {
  Vehicle = mongoose.model<VehicleInterface & Document>(
    "Vehicle",
    vehicleSchema
  );
}

export default Vehicle;
