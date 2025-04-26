import mongoose, { Schema, Document } from "mongoose";

interface ITripperPostComment extends Document {
  user: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  likes: number;
}

export interface ITripperPost extends Document {
  user: mongoose.Types.ObjectId;
  caption: string;
  mediaUrl: string;
  mediaType: "image" | "video";
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

const TripperPostSchema = new Schema<ITripperPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caption: { type: String, required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    location: { type: String, required: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: [TripperPostCommentSchema],
  },
  { timestamps: true }
);

export default mongoose.model<ITripperPost>("TripperPost", TripperPostSchema);
