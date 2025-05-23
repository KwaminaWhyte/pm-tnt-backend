import mongoose, { type Model, Schema, Document } from "mongoose";
import { RoomInterface } from "~/utils/types";

/**
 * Room Schema - Represents a hotel room in the system
 *
 * @remarks
 * Rooms belong to a hotel and have features, pricing, and availability status
 */
const roomSchema = new Schema<RoomInterface & Document>(
  {
    hotel: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel reference is required"],
      index: true,
    },
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, "Floor number is required"],
      min: [0, "Floor number must be non-negative"],
    },
    roomType: {
      type: String,
      required: [true, "Room type is required"],
      trim: true,
      enum: {
        values: ["Single", "Double", "Twin", "Suite", "Deluxe", "Presidential"],
        message: "{VALUE} is not a valid room type",
      },
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0, "Price must be non-negative"],
    },
    capacity: {
      type: Number,
      required: [true, "Room capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    maintenanceStatus: {
      type: String,
      enum: {
        values: ["Available", "Cleaning", "Maintenance"],
        message: "{VALUE} is not a valid maintenance status",
      },
      default: "Available",
      index: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
    },
    size: {
      type: Number,
      min: [0, "Room size must be non-negative"],
    },
    bedType: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ pricePerNight: 1 });
roomSchema.index({ capacity: 1 });

// Compound index for common queries
roomSchema.index({ hotel: 1, isAvailable: 1, capacity: 1 });

// Virtuals
roomSchema.virtual("isOccupied").get(function () {
  return !this.isAvailable || this.maintenanceStatus !== "Available";
});

// Methods
roomSchema.methods.markAsUnavailable = function () {
  this.isAvailable = false;
  return this.save();
};

roomSchema.methods.markAsAvailable = function () {
  this.isAvailable = true;
  this.maintenanceStatus = "Available";
  return this.save();
};

// Create or retrieve the model
let Room: Model<RoomInterface & Document>;
try {
  Room = mongoose.model<RoomInterface & Document>("Room");
} catch (error) {
  Room = mongoose.model<RoomInterface & Document>("Room", roomSchema);
}

export default Room;
