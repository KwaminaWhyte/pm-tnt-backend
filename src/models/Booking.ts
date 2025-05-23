import mongoose, { type Model, Schema, Document } from "mongoose";
import { BookingInterface } from "../utils/types";

/**
 * Location Schema - Represents a physical location with coordinates
 */
const locationSchema = new Schema(
  {
    address: { 
      type: String, 
      required: [true, 'Address is required'],
      trim: true 
    },
    city: { 
      type: String, 
      required: [true, 'City is required'],
      trim: true 
    },
    country: { 
      type: String, 
      required: [true, 'Country is required'],
      trim: true 
    },
    coordinates: {
      latitude: { 
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: { 
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      },
    },
  },
  { _id: false }
);

/**
 * Transaction Schema - Represents a payment transaction
 */
const transactionSchema = new Schema(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0, 'Amount must be non-negative']
    },
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      trim: true
    },
    status: {
      type: String,
      required: [true, 'Transaction status is required'],
      enum: {
        values: ['Pending', 'Completed', 'Failed', 'Refunded'],
        message: '{VALUE} is not a valid transaction status'
      }
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { _id: true, timestamps: true }
);

/**
 * Participant Schema - Represents a participant in a package booking
 */
const participantSchema = new Schema(
  {
    type: {
      type: String,
      enum: {
        values: ["adult", "child", "infant"],
        message: '{VALUE} is not a valid participant type'
      },
      required: [true, 'Participant type is required']
    },
    count: {
      type: Number,
      required: [true, 'Participant count is required'],
      min: [1, 'Count must be at least 1']
    }
  },
  { _id: true }
);

/**
 * Fee Schema - Represents a fee applied to a booking
 */
const feeSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Fee name is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Fee amount is required'],
      min: [0, 'Fee must be non-negative']
    },
    description: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

/**
 * Discount Schema - Represents a discount applied to a booking
 */
const discountSchema = new Schema(
  {
    type: {
      type: String,
      required: [true, 'Discount type is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Discount amount is required'],
      min: [0, 'Discount must be non-negative']
    },
    code: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

/**
 * Booking Schema - Represents a booking in the system
 * 
 * @remarks
 * Bookings can be for hotels, vehicles, or packages
 */
const bookingSchema = new Schema<BookingInterface & Document>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'User reference is required'],
      index: true,
    },
    bookingType: {
      type: String,
      enum: {
        values: ["hotel", "vehicle", "package"],
        message: '{VALUE} is not a valid booking type'
      },
      required: [true, 'Booking type is required'],
      index: true,
    },
    bookingReference: {
      type: String,
      required: [true, 'Booking reference is required'],
      unique: true,
      index: true,
      trim: true
    },
    bookingDate: {
      type: Date,
      required: [true, 'Booking date is required'],
      default: Date.now,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
      validate: {
        validator: function(value: Date) {
          // Start date should be today or in the future
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return value >= today;
        },
        message: 'Start date cannot be in the past'
      }
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
      validate: {
        validator: function(this: any, value: Date) {
          return value > this.startDate;
        },
        message: 'End date must be after start date'
      }
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
      numberOfGuests: {
        type: Number,
        min: [1, 'Number of guests must be at least 1']
      },
      roomTypes: [{
        type: String,
        trim: true
      }],
      mealPlan: {
        type: String,
        trim: true
      },
      specialRequests: {
        type: String,
        trim: true
      },
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
        name: {
          type: String,
          trim: true
        },
        licenseNumber: {
          type: String,
          trim: true
        },
        expiryDate: Date,
        phoneNumber: {
          type: String,
          trim: true
        },
      },
    },

    // Package Booking Details
    packageBooking: {
      package: {
        type: Schema.Types.ObjectId,
        ref: "Package",
        required: function (this: BookingInterface) {
          return this.bookingType === "package";
        },
      },
      participants: [participantSchema],
      customizations: {
        notes: {
          type: String,
          trim: true
        },
        preferences: [{
          type: String,
          trim: true
        }],
        dietaryRestrictions: [{
          type: String,
          trim: true
        }],
        specialRequests: {
          type: String,
          trim: true
        },
      },
      itinerary: {
        currentDestination: {
          type: Schema.Types.ObjectId,
          ref: "Destination",
        },
        progress: {
          completedActivities: [
            { type: Schema.Types.ObjectId, ref: "Activity" },
          ],
          nextActivity: { type: Schema.Types.ObjectId, ref: "Activity" },
        },
        status: {
          type: String,
          enum: {
            values: ["NotStarted", "InProgress", "Completed", "Cancelled"],
            message: '{VALUE} is not a valid itinerary status'
          },
          default: "NotStarted",
        },
      },
    },

    pricing: {
      basePrice: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [0, 'Base price must be non-negative'],
      },
      taxes: {
        type: Number,
        required: [true, 'Taxes amount is required'],
        min: [0, 'Taxes must be non-negative'],
      },
      fees: [feeSchema],
      discounts: [discountSchema],
      totalPrice: {
        type: Number,
        required: [true, 'Total price is required'],
        min: [0, 'Total price must be non-negative'],
      },
    },

    payment: {
      method: {
        type: String,
        enum: {
          values: ["Credit Card", "Debit Card", "PayPal", "Bank Transfer"],
          message: '{VALUE} is not a valid payment method'
        },
      },
      status: {
        type: String,
        enum: {
          values: ["Pending", "Paid", "Partially Paid", "Failed", "Refunded"],
          message: '{VALUE} is not a valid payment status'
        },
        required: [true, 'Payment status is required'],
        default: "Pending",
      },
      transactions: [transactionSchema],
      refund: {
        amount: {
          type: Number,
          min: [0, 'Refund amount must be non-negative']
        },
        reason: {
          type: String,
          trim: true
        },
        status: {
          type: String,
          enum: {
            values: ["Pending", "Processed", "Rejected"],
            message: '{VALUE} is not a valid refund status'
          },
        },
        processedAt: Date,
      },
    },

    status: {
      type: String,
      enum: {
        values: [
          "Draft",
          "Pending",
          "Confirmed",
          "InProgress",
          "Completed",
          "Cancelled",
        ],
        message: '{VALUE} is not a valid booking status'
      },
      required: [true, 'Booking status is required'],
      default: "Draft",
      index: true,
    },

    cancellation: {
      reason: {
        type: String,
        trim: true
      },
      cancelledAt: Date,
      refundAmount: {
        type: Number,
        min: [0, 'Refund amount must be non-negative']
      },
      cancellationFee: {
        type: Number,
        min: [0, 'Cancellation fee must be non-negative']
      },
      cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    },

    notes: {
      type: String,
      trim: true
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
bookingSchema.index({ user: 1, bookingType: 1, status: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });
bookingSchema.index({ "payment.status": 1, status: 1 });
bookingSchema.index({ "hotelBooking.hotelId": 1 }, { sparse: true });
bookingSchema.index({ "vehicleBooking.vehicleId": 1 }, { sparse: true });
bookingSchema.index({ "packageBooking.package": 1 }, { sparse: true });
bookingSchema.index({ bookingDate: -1 }); // For sorting by most recent

// Virtuals
bookingSchema.virtual('duration').get(function() {
  if (!this.startDate || !this.endDate) return 0;
  const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
});

bookingSchema.virtual('isPaid').get(function() {
  return this.payment?.status === 'Paid';
});

bookingSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && 
         this.status !== 'Cancelled' && this.status !== 'Draft';
});

/**
 * Generate unique booking reference
 */
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

/**
 * Validate booking details based on booking type
 */
bookingSchema.pre("save", function (next) {
  // Validate hotel booking details
  if (this.bookingType === 'hotel') {
    if (!this.hotelBooking?.hotelId) {
      return next(new Error('Hotel ID is required for hotel bookings'));
    }
    if (!this.hotelBooking.roomIds || this.hotelBooking.roomIds.length === 0) {
      return next(new Error('At least one room must be selected for hotel bookings'));
    }
  }
  
  // Validate vehicle booking details
  if (this.bookingType === 'vehicle') {
    if (!this.vehicleBooking?.vehicleId) {
      return next(new Error('Vehicle ID is required for vehicle bookings'));
    }
    if (!this.vehicleBooking.pickupLocation) {
      return next(new Error('Pickup location is required for vehicle bookings'));
    }
  }
  
  // Validate package booking details
  if (this.bookingType === 'package') {
    if (!this.packageBooking?.package) {
      return next(new Error('Package ID is required for package bookings'));
    }
    if (!this.packageBooking.participants || this.packageBooking.participants.length === 0) {
      return next(new Error('At least one participant is required for package bookings'));
    }
  }
  
  next();
});

/**
 * Methods
 */
bookingSchema.methods.cancel = function(reason: string, cancelledBy?: string) {
  this.status = 'Cancelled';
  this.cancellation = {
    reason,
    cancelledAt: new Date(),
    cancelledBy: cancelledBy ? new mongoose.Types.ObjectId(cancelledBy) : undefined
  };
  return this.save();
};

bookingSchema.methods.calculateTotalPrice = function() {
  const basePrice = this.pricing.basePrice || 0;
  const taxes = this.pricing.taxes || 0;
  
  const feesTotal = this.pricing.fees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
  const discountsTotal = this.pricing.discounts?.reduce((sum, discount) => sum + discount.amount, 0) || 0;
  
  this.pricing.totalPrice = basePrice + taxes + feesTotal - discountsTotal;
  return this.pricing.totalPrice;
};

// Create or retrieve the model
let Booking: Model<BookingInterface & Document>;
try {
  Booking = mongoose.model<BookingInterface & Document>("Booking");
} catch (error) {
  Booking = mongoose.model<BookingInterface & Document>("Booking", bookingSchema);
}

export default Booking;
