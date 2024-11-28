import { type Model, Schema } from "mongoose";
import mongoose from "~/utils/mongoose";
import { FaqInterface } from "~/utils/types";

const faqSchema = new Schema<FaqInterface>(
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

let Faq: Model<FaqInterface>;
try {
  Faq = mongoose.model<FaqInterface>("faqs");
} catch (error) {
  Faq = mongoose.model<FaqInterface>("faqs", faqSchema);
}

export default Faq;
