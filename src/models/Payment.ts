import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Interface for the Payment document
 */
export interface PaymentInterface extends Document {
  user: mongoose.Types.ObjectId;
  phoneNumber: string;
  invoiceId: string;
  checkoutId?: string;
  amount: number;
  totalAmountCharged?: number;
  status: "new" | "paid" | "cancelled" | "awaiting_payment" | "failed" | "refunded" | "partially_refunded";
  paymentChannel?: string;
  cardNumber?: string;
  credited: boolean;
  currency: string;
  description?: string;
  bookingId?: mongoose.Types.ObjectId;
  paymentMethod?: string;
  paymentDate?: Date;
  refundAmount?: number;
  refundDate?: Date;
  refundReason?: string;
  transactionFee?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markAsPaid(paymentDate?: Date): Promise<PaymentInterface>;
  processRefund(amount: number, reason: string): Promise<PaymentInterface>;
  calculateFee(): number;
}

/**
 * Transaction Fee Schema - Represents the fee structure for a payment
 */
const transactionFeeSchema = new Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Fee amount is required'],
      min: [0, 'Fee amount must be non-negative']
    },
    type: {
      type: String,
      enum: {
        values: ['fixed', 'percentage'],
        message: '{VALUE} is not a valid fee type'
      },
      required: [true, 'Fee type is required']
    },
    description: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

/**
 * Payment Schema - Represents payment transactions in the system
 */
const paymentSchema = new Schema<PaymentInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'User ID is required'],
      index: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    invoiceId: {
      type: String,
      required: [true, 'Invoice ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    checkoutId: {
      type: String,
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be non-negative'],
      index: true
    },
    totalAmountCharged: {
      type: Number,
      min: [0, 'Total amount charged must be non-negative']
    },
    status: {
      type: String,
      enum: {
        values: ["new", "paid", "cancelled", "awaiting_payment", "failed", "refunded", "partially_refunded"],
        message: '{VALUE} is not a valid payment status'
      },
      default: "new",
      index: true
    },
    paymentChannel: {
      type: String,
      trim: true
    },
    cardNumber: {
      type: String,
      trim: true,
      // Store only last 4 digits for security
      match: [/^\d{4}$/, 'Card number should only be the last 4 digits']
    },
    credited: {
      type: Boolean,
      default: false,
      index: true
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
      trim: true,
      uppercase: true,
      minlength: [3, 'Currency code must be 3 characters'],
      maxlength: [3, 'Currency code must be 3 characters']
    },
    description: {
      type: String,
      trim: true
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      index: true
    },
    paymentMethod: {
      type: String,
      trim: true,
      enum: {
        values: ["credit_card", "debit_card", "mobile_money", "bank_transfer", "cash", "paypal", "other"],
        message: '{VALUE} is not a valid payment method'
      }
    },
    paymentDate: {
      type: Date
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount must be non-negative']
    },
    refundDate: {
      type: Date
    },
    refundReason: {
      type: String,
      trim: true
    },
    transactionFee: {
      type: transactionFeeSchema
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      description: 'Additional payment metadata'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance optimization
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ bookingId: 1 });

// Virtuals
paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'paid';
});

paymentSchema.virtual('netAmount').get(function() {
  if (!this.totalAmountCharged) return this.amount;
  const fee = this.transactionFee?.amount || 0;
  return this.totalAmountCharged - fee;
});

paymentSchema.virtual('isRefunded').get(function() {
  return this.status === 'refunded' || this.status === 'partially_refunded';
});

// Methods

/**
 * Mark payment as paid
 * @param paymentDate - Optional date of payment, defaults to current date
 */
paymentSchema.methods.markAsPaid = async function(paymentDate?: Date): Promise<PaymentInterface> {
  this.status = 'paid';
  this.paymentDate = paymentDate || new Date();
  this.credited = true;
  return this.save();
};

/**
 * Process a refund for this payment
 * @param amount - Amount to refund
 * @param reason - Reason for the refund
 */
paymentSchema.methods.processRefund = async function(amount: number, reason: string): Promise<PaymentInterface> {
  if (this.status !== 'paid') {
    throw new Error('Only paid payments can be refunded');
  }
  
  if (amount <= 0) {
    throw new Error('Refund amount must be positive');
  }
  
  if (amount > this.amount) {
    throw new Error('Refund amount cannot exceed original payment amount');
  }
  
  this.refundAmount = amount;
  this.refundDate = new Date();
  this.refundReason = reason;
  
  // Set status based on whether it's a full or partial refund
  this.status = amount === this.amount ? 'refunded' : 'partially_refunded';
  
  return this.save();
};

/**
 * Calculate the transaction fee
 */
paymentSchema.methods.calculateFee = function(): number {
  if (!this.transactionFee) return 0;
  
  if (this.transactionFee.type === 'fixed') {
    return this.transactionFee.amount;
  } else if (this.transactionFee.type === 'percentage') {
    return (this.amount * this.transactionFee.amount) / 100;
  }
  
  return 0;
};

// Statics

/**
 * Find payments by booking ID
 */
paymentSchema.statics.findByBookingId = async function(bookingId: mongoose.Types.ObjectId): Promise<PaymentInterface[]> {
  return this.find({ bookingId }).sort({ createdAt: -1 });
};

/**
 * Get total payments for a user
 */
paymentSchema.statics.getTotalPaymentsForUser = async function(userId: mongoose.Types.ObjectId): Promise<number> {
  const result = await this.aggregate([
    { $match: { user: userId, status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

// Create or retrieve the model
let Payment: Model<PaymentInterface>;
try {
  Payment = mongoose.model<PaymentInterface>("Payment");
} catch (error) {
  Payment = mongoose.model<PaymentInterface>("Payment", paymentSchema);
}

export default Payment;
