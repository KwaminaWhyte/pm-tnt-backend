import { Schema } from "mongoose";
import { DestinationInterface } from "~/utils/types";
import mongoose from "../mongoose";

const schema = new Schema<DestinationInterface>(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
    },
    description: String,
    images: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

let Destination: mongoose.Model<DestinationInterface>;
try {
  Destination = mongoose.model<DestinationInterface>("destinations");
} catch (error) {
  Destination = mongoose.model<DestinationInterface>("destinations", schema);
}

export default Destination;
