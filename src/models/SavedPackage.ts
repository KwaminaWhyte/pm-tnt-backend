import { type Model, Schema } from "mongoose";
import mongoose from "~/utils/mongoose";
import { SavedPacakgeInterface } from "~/utils/types";

const schema = new Schema<SavedPacakgeInterface>(
  {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "packages",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  },
  { timestamps: true }
);

let SavedPacakge: Model<SavedPacakgeInterface>;
try {
  SavedPacakge = mongoose.model<SavedPacakgeInterface>("saved_packages");
} catch (error) {
  SavedPacakge = mongoose.model<SavedPacakgeInterface>(
    "saved_packages",
    schema
  );
}

export default SavedPacakge;
