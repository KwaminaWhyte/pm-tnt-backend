import mongoose, { type Model, Schema } from "mongoose";
import { OtpInterface } from "~/utils/types";

const otpSchema = new Schema<OtpInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

let Otp: Model<OtpInterface>;
try {
  Otp = mongoose.model<OtpInterface>("Otp");
} catch (error) {
  Otp = mongoose.model<OtpInterface>("Otp", otpSchema);
}

export default Otp;
