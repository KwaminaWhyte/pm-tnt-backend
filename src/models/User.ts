import mongoose, { type Model, Schema } from "mongoose";
import { UserInterface } from "../utils/types";

const userSchema = new mongoose.Schema<UserInterface>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: String,
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email format"],
    },
    password: {
      type: String,
      required: function (this: any) {
        return Boolean(this.email); // Password required only if email exists
      },
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^\+?[0-9]\d{1,14}$/, "Invalid phone number format"],
    },
    otp: {
      code: String,
      expiresAt: Date,
    },
    position: {
      type: String,
    },
    photo: {
      type: String,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
  },
  {
    timestamps: true,
  }
);

let User: mongoose.Model<UserInterface>;
try {
  User = mongoose.model<UserInterface>("User");
} catch (error) {
  User = mongoose.model<UserInterface>("User", userSchema);
}

export default User;
