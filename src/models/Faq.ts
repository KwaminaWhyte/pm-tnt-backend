import { type Model, Schema } from "mongoose";
import mongoose from "~/utils/mongoose";
import { FaqInterface } from "~/utils/types";

const faqSchema = new Schema<FaqInterface>(
  {
    question: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    answer: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

let Faq: Model<FaqInterface>;
try {
  Faq = mongoose.model<FaqInterface>("Faq");
} catch (error) {
  Faq = mongoose.model<FaqInterface>("Faq", faqSchema);
}

export default Faq;
