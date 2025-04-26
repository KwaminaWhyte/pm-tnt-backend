import mongoose, { Schema, Document } from "mongoose";

interface ITripperPostComment extends Document {
  user: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  likes: number;
}

interface ITripperMedia {
  url: string;
  type: "image" | "video";
}

export interface ITripperPost extends Document {
  user: mongoose.Types.ObjectId;
  caption: string;
  media: ITripperMedia[];
  location: string;
  createdAt: Date;
  likes: number;
  dislikes: number;
  comments: ITripperPostComment[];
}

const TripperPostCommentSchema = new Schema<ITripperPostComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const TripperMediaSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video"], required: true },
});

const TripperPostSchema = new Schema<ITripperPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caption: { type: String, required: true },
    media: { type: [TripperMediaSchema], required: true },
    location: { type: String, required: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: [TripperPostCommentSchema],
  },
  { timestamps: true }
);

export default mongoose.model<ITripperPost>("TripperPost", TripperPostSchema);
