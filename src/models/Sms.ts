import mongoose, { type Model, Schema } from "mongoose";
import { SmsInterface } from "../utils/types";

const schema = new Schema(
  {
    phone: { type: String, required: true },
    from: { type: String, required: true },
    message: { type: String, required: true },
    isSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

let Sms: Model<SmsInterface>;
try {
  Sms = mongoose.model<SmsInterface>("Sms");
} catch (error) {
  Sms = mongoose.model<SmsInterface>("Sms", schema);
}

export default Sms;
