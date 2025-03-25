import { Schema } from "mongoose";
import mongoose from "~/mongoose";
const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const schema = new Schema<ApplicationInterface>(
  {
    uniqueId: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    middleName: String,
    nickname: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    workPhone: String,
    homePhone: String,
    cellPhone: String,
    email: {
      type: String,
      required: true,
      match: emailRegex,
    },
    emergencyContactName: String,
    relationship: String,
    emergencyContactPhone: String,
    addressSameAsMember: String,
    emergencyContactStreet: String,
    emergencyContactCity: String,
    emergencyContactState: String,
    emergencyContactPostalCode: String,
    emergencyContactCountry: String,
  },
  {
    timestamps: true,
  }
);

let Application: mongoose.Model<ApplicationInterface>;
try {
  Application = mongoose.model<ApplicationInterface>("applications");
} catch (error) {
  Application = mongoose.model<ApplicationInterface>("applications", schema);
}

export default Application;
