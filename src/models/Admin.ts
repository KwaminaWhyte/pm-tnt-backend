import { Schema } from "mongoose";
import mongoose from "~/utils/mongoose";
import { AdminInterface } from "~/utils/types";
const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const adminSchema = new Schema<AdminInterface>(
  {
    firstName: String,
    lastName: String,
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [emailRegex, "Invalid email format"],
    },
    phone: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

let Admin: mongoose.Model<AdminInterface>;
try {
  Admin = mongoose.model<AdminInterface>("admins");
} catch (error) {
  Admin = mongoose.model<AdminInterface>("admins", adminSchema);
}

export default Admin;
