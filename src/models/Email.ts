import mongoose, { type Model, Schema } from "mongoose";
import { EmailInterface } from "../utils/types";

const schema = new Schema(
  {
    email: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    isSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

let Email: Model<EmailInterface>;
try {
  Email = mongoose.model<EmailInterface>("Email");
} catch (error) {
  Email = mongoose.model<EmailInterface>("Email", schema);
}

export default Email;
