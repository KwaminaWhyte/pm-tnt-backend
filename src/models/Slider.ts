import mongoose, { Schema, Document } from "mongoose";

export interface ISlider extends Document {
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SliderSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },
    ctaText: {
      type: String,
      required: [true, "CTA text is required"],
      trim: true,
    },
    ctaLink: {
      type: String,
      required: [true, "CTA link is required"],
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISlider>("Slider", SliderSchema);
