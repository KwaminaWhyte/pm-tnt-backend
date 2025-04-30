import mongoose, { type Model, Schema } from "mongoose";
import { BookingInterface } from "~/utils/types";

const locationSchema = new Schema(
  {
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  { _id: false }
);

const bookingSchema = new Schema<BookingInterface>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    bookingType: {
      type: String,
      enum: ["hotel", "vehicle", "package"],
      required: true,
      index: true,
    },
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bookingDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Hotel Booking Details
    hotelBooking: {
      hotelId: {
        type: Schema.Types.ObjectId,
        ref: "Hotel",
        required: function (this: BookingInterface) {
          return this.bookingType === "hotel";
        },
      },
      roomIds: [
        {
          type: Schema.Types.ObjectId,
          ref: "Room",
        },
      ],
      numberOfGuests: Number,
      roomTypes: [String],
      mealPlan: String,
      specialRequests: String,
    },

    // Vehicle Booking Details
    vehicleBooking: {
      vehicleId: {
        type: Schema.Types.ObjectId,
        ref: "Vehicle",
        required: function (this: BookingInterface) {
          return this.bookingType === "vehicle";
        },
      },
      pickupLocation: locationSchema,
      dropoffLocation: locationSchema,
      driverDetails: {
        name: String,
        licenseNumber: String,
        expiryDate: Date,
        phoneNumber: String,
      },
    },

    // Package Booking Details
    packageBooking: {
      packageId: {
        type: Schema.Types.ObjectId,
        ref: "Package",
        required: function (this: BookingInterface) {
          return this.bookingType === "package";
        },
      },
      participants: [
        {
          type: {
            type: String,
            enum: ["adult", "child", "infant"],
            required: true,
          },
          count: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],
      customizations: {
        notes: String,
        preferences: [String],
        dietaryRestrictions: [String],
        specialRequests: String,
      },
      itinerary: {
        currentDestination: {
          type: Schema.Types.ObjectId,
          ref: "destinations",
        },
        progress: {
          completedActivities: [
            { type: Schema.Types.ObjectId, ref: "activities" },
          ],
          nextActivity: { type: Schema.Types.ObjectId, ref: "activities" },
        },
        status: {
          type: String,
          enum: ["NotStarted", "InProgress", "Completed", "Cancelled"],
          default: "NotStarted",
        },
      },
    },

    pricing: {
      basePrice: {
        type: Number,
        required: true,
        min: 0,
      },
      taxes: {
        type: Number,
        required: true,
        min: 0,
      },
      fees: [
        {
          name: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          description: String,
        },
      ],
      discounts: [
        {
          type: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          code: String,
        },
      ],
      totalPrice: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    payment: {
      method: {
        type: String,
        enum: ["Credit Card", "Debit Card", "PayPal", "Bank Transfer"],
      },
      status: {
        type: String,
        enum: ["Pending", "Paid", "Partially Paid", "Failed", "Refunded"],
        required: true,
        default: "Pending",
      },
      transactions: [
        {
          transactionId: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          method: {
            type: String,
            required: true,
          },
          status: {
            type: String,
            required: true,
          },
          timestamp: {
            type: Date,
            required: true,
            default: Date.now,
          },
        },
      ],
      refund: {
        amount: Number,
        reason: String,
        status: {
          type: String,
          enum: ["Pending", "Processed", "Rejected"],
        },
        processedAt: Date,
      },
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Pending",
        "Confirmed",
        "InProgress",
        "Completed",
        "Cancelled",
      ],
      required: true,
      default: "Draft",
      index: true,
    },

    cancellation: {
      reason: String,
      cancelledAt: Date,
      refundAmount: Number,
      cancellationFee: Number,
      cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    },

    // contactInfo: {
    //   name: {
    //     type: String,
    //     required: true
    //   },
    //   email: {
    //     type: String,
    //     required: true,
    //     lowercase: true,
    //     trim: true
    //   },
    //   phone: {
    //     type: String,
    //     required: true
    //   },
    //   emergencyContact: {
    //     name: String,
    //     phone: String,
    //     relationship: String
    //   }
    // },

    notes: String,
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
bookingSchema.index({ userId: 1, bookingType: 1, status: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });
bookingSchema.index({ "payment.status": 1, status: 1 });
bookingSchema.index({ "hotelBooking.hotelId": 1 }, { sparse: true });
bookingSchema.index({ "vehicleBooking.vehicleId": 1 }, { sparse: true });
bookingSchema.index({ "packageBooking.packageId": 1 }, { sparse: true });

// Generate unique booking reference
bookingSchema.pre("save", async function (next) {
  if (this.isNew) {
    const prefix = this.bookingType.charAt(0).toUpperCase(); // H for hotel, V for vehicle, P for package
    const date = new Date().toISOString().slice(2, 8).replace(/-/g, ""); // YYMMDD
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.bookingReference = `${prefix}${date}${random}`;
  }
  next();
});

// Validate dates
bookingSchema.pre("save", function (next) {
  if (this.startDate >= this.endDate) {
    next(new Error("End date must be after start date"));
  }
  if (this.startDate < new Date()) {
    next(new Error("Start date cannot be in the past"));
  }
  next();
});

let Booking: Model<BookingInterface>;
try {
  Booking = mongoose.model<BookingInterface>("bookings");
} catch (error) {
  Booking = mongoose.model<BookingInterface>("bookings", bookingSchema);
}

export default Booking;
