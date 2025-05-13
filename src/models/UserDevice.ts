import mongoose, { type Model, Schema } from "mongoose";
import { UserDeviceInterface } from "../utils/types";

const schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    deviceToken: { type: String, required: true },
    deviceType: { type: String, required: true },
    deviceName: { type: String, required: true },
  },
  { timestamps: true }
);

let UserDevice: Model<UserDeviceInterface>;
try {
  UserDevice = mongoose.model<UserDeviceInterface>("UserDevice");
} catch (error) {
  UserDevice = mongoose.model<UserDeviceInterface>("UserDevice", schema);
}

export default UserDevice;
