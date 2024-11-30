import { type Model, Schema } from "mongoose";
import { BookingInterface } from "~/utils/types";
import mongoose from "../mongoose";

const locationSchema = new Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
}, { _id: false });

const schema = new Schema<BookingInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    hotel: {
      type: Schema.Types.ObjectId,
      ref: "hotels",
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: "vehicles",
    },
    travelPackage: {
      type: Schema.Types.ObjectId,
      ref: "packages",
    },
    bookingDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    bookingDetails: {
      // Hotel specific
      roomIds: [{ type: Schema.Types.ObjectId }],
      numberOfGuests: Number,
      specialRequests: String,
      
      // Vehicle specific
      pickupLocation: locationSchema,
      dropoffLocation: locationSchema,
      driverDetails: {
        licenseNumber: String,
        expiryDate: Date,
      },
    },
    pricing: {
      basePrice: { type: Number, required: true },
      taxes: { type: Number, required: true },
      fees: [{
        name: { type: String, required: true },
        amount: { type: Number, required: true }
      }],
      discounts: [{
        type: { type: String, required: true },
        amount: { type: Number, required: true }
      }],
      totalPrice: { type: Number, required: true }
    },
    payment: {
      method: {
        type: String,
        enum: ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer']
      },
      transactionId: String,
      paidAmount: Number,
      paidAt: Date,
      refundStatus: {
        type: String,
        enum: ['None', 'Pending', 'Refunded', 'Denied'],
        default: 'None'
      }
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partially Paid", "Unpaid", "Refunded"],
      default: "Unpaid",
      required: true
    },
    cancellation: {
      cancelledAt: Date,
      reason: String,
      refundAmount: Number,
      cancellationFee: Number
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
schema.index({ user: 1, status: 1 });
schema.index({ startDate: 1, endDate: 1 });
schema.index({ "bookingDetails.pickupLocation.city": 1 });
schema.index({ "bookingDetails.dropoffLocation.city": 1 });
schema.index({ paymentStatus: 1 });

// Middleware to validate dates
schema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Virtual for booking duration
schema.virtual('duration').get(function() {
  return Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
});

let Booking: Model<BookingInterface>;
try {
  Booking = mongoose.model<BookingInterface>("bookings");
} catch (error) {
  Booking = mongoose.model<BookingInterface>("bookings", schema);
}

export default Booking;
