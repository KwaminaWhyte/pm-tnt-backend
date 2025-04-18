import mongoose, { Schema, Document } from "mongoose";

interface ITripperPostComment extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: Date;
  likes: number;
}

export interface ITripperPost extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar: string;
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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userAvatar: { type: String, required: true },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const TripperPostSchema = new Schema<ITripperPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userAvatar: { type: String, required: true },
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
