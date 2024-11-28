import { type Model, Schema } from "mongoose";
import mongoose from "~/utils/mongoose";
import { ActivityInterface } from "~/utils/types";

const schema = new Schema<ActivityInterface>(
  {
    name: { type: String, required: true },
    destination: {
      type: Schema.Types.ObjectId,
      ref: "destinations",
    },
    description: String,
    price: { type: Number, required: true },
    duration: { type: Number }, // in hours
    availability: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    images: [String],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

let Activity: Model<ActivityInterface>;
try {
  Activity = mongoose.model<ActivityInterface>("activities");
} catch (error) {
  Activity = mongoose.model<ActivityInterface>("activities", schema);
}

export default Activity;
