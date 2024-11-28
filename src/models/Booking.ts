import { type Model, Schema } from "mongoose";
import mongoose from "~/utils/mongoose";
import { BookingInterface } from "~/utils/types";

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
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid"],
      default: "Unpaid",
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

let Booking: Model<BookingInterface>;
try {
  Booking = mongoose.model<BookingInterface>("bookings");
} catch (error) {
  Booking = mongoose.model<BookingInterface>("bookings", schema);
}

export default Booking;
