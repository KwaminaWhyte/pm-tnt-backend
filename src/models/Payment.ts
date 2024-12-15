import { Schema } from "mongoose";
import mongoose from "~/utils/mongoose";
import type { PaymentInterface } from "~/utils/types";

const schema = new Schema<PaymentInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    invoiceId: {
      type: String,
      required: true,
    },
    checkoutId: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      default: 0,
      required: true,
    },
    totalAmountCharged: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      enum: ["new", "paid", "cancelled", "awaiting_payment", "failed"],
      default: "new",
    },
    paymentChannel: {
      type: String,
    },
    cardNumber: {
      type: String,
      required: false,
    },
    credited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

let Payment: mongoose.Model<PaymentInterface>;
try {
  Payment = mongoose.model<PaymentInterface>("payments");
} catch (error) {
  Payment = mongoose.model<PaymentInterface>("payments", schema);
}

export default Payment;
