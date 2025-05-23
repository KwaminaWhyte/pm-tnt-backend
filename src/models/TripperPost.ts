import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Interface for TripperPost Comment
 */
interface TripperPostCommentInterface extends Document {
  user: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  likedBy: mongoose.Types.ObjectId[];
}

/**
 * Interface for TripperPost Media
 */
interface TripperMediaInterface {
  url: string;
  type: "image" | "video";
  caption?: string;
  order?: number;
  width?: number;
  height?: number;
  duration?: number; // For videos, in seconds
  thumbnailUrl?: string; // For videos
}

/**
 * Interface for TripperPost Location
 */
interface TripperLocationInterface {
  name: string;
  coordinates?: [number, number]; // [longitude, latitude]
  city?: string;
  country?: string;
}

/**
 * Interface for TripperPost Tag
 */
interface TripperTagInterface {
  user: mongoose.Types.ObjectId;
  position?: {
    x: number; // Percentage from left (0-100)
    y: number; // Percentage from top (0-100)
  };
}

/**
 * Interface for TripperPost Model
 */
interface TripperPostModel extends Model<TripperPostInterface> {
  findPopular(limit?: number): Promise<TripperPostInterface[]>;
  findByLocation(location: string): Promise<TripperPostInterface[]>;
  findByUser(userId: mongoose.Types.ObjectId): Promise<TripperPostInterface[]>;
}

/**
 * Interface for TripperPost Document
 */
export interface TripperPostInterface extends Document {
  user: mongoose.Types.ObjectId;
  caption: string;
  media: TripperMediaInterface[];
  location: TripperLocationInterface;
  tags?: TripperTagInterface[];
  hashtags?: string[];
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  dislikes: number;
  likedBy: mongoose.Types.ObjectId[];
  dislikedBy: mongoose.Types.ObjectId[];
  comments: TripperPostCommentInterface[];
  isPrivate: boolean;
  isArchived: boolean;
  viewCount: number;
  shareCount: number;
  saveCount: number;
  savedBy: mongoose.Types.ObjectId[];
  reportCount: number;
  reportedBy: mongoose.Types.ObjectId[];
  reportReasons?: string[];

  // Methods
  like(userId: mongoose.Types.ObjectId): Promise<TripperPostInterface>;
  unlike(userId: mongoose.Types.ObjectId): Promise<TripperPostInterface>;
  dislike(userId: mongoose.Types.ObjectId): Promise<TripperPostInterface>;
  undislike(userId: mongoose.Types.ObjectId): Promise<TripperPostInterface>;
  addComment(
    userId: mongoose.Types.ObjectId,
    text: string
  ): Promise<TripperPostCommentInterface>;
  incrementViewCount(): Promise<TripperPostInterface>;
  incrementShareCount(): Promise<TripperPostInterface>;
  savePost(userId: mongoose.Types.ObjectId): Promise<TripperPostInterface>;
  unsave(userId: mongoose.Types.ObjectId): Promise<TripperPostInterface>;
  report(
    userId: mongoose.Types.ObjectId,
    reason: string
  ): Promise<TripperPostInterface>;
}

/**
 * Schema for TripperPost Comment
 */
const tripperPostCommentSchema = new Schema<TripperPostCommentInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    likes: {
      type: Number,
      default: 0,
      min: [0, "Likes count cannot be negative"],
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Schema for TripperPost Media
 */
const tripperMediaSchema = new Schema(
  {
    url: {
      type: String,
      required: [true, "Media URL is required"],
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Media URL must be a valid URL",
      },
    },
    type: {
      type: String,
      enum: {
        values: ["image", "video"],
        message: "{VALUE} is not a valid media type",
      },
      required: [true, "Media type is required"],
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [200, "Media caption cannot exceed 200 characters"],
    },
    order: {
      type: Number,
      min: [0, "Order must be non-negative"],
      default: 0,
    },
    width: {
      type: Number,
      min: [0, "Width must be non-negative"],
    },
    height: {
      type: Number,
      min: [0, "Height must be non-negative"],
    },
    duration: {
      type: Number,
      min: [0, "Duration must be non-negative"],
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Thumbnail URL must be a valid URL",
      },
    },
  },
  { _id: false }
);

/**
 * Schema for TripperPost Location
 */
const tripperLocationSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
      index: true,
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function (v: number[]) {
          return (
            !v ||
            (v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 && // longitude
              v[1] >= -90 &&
              v[1] <= 90) // latitude
          );
        },
        message:
          "Coordinates must be [longitude, latitude] and within valid ranges",
      },
      index: "2dsphere",
    },
    city: {
      type: String,
      trim: true,
      index: true,
    },
    country: {
      type: String,
      trim: true,
      index: true,
    },
  },
  { _id: false }
);

/**
 * Schema for TripperPost Tag
 */
const tripperTagSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    position: {
      x: {
        type: Number,
        min: [0, "X position must be between 0 and 100"],
        max: [100, "X position must be between 0 and 100"],
      },
      y: {
        type: Number,
        min: [0, "Y position must be between 0 and 100"],
        max: [100, "Y position must be between 0 and 100"],
      },
    },
  },
  { _id: false }
);

/**
 * Schema for TripperPost
 */
const tripperPostSchema = new Schema<TripperPostInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    caption: {
      type: String,
      required: [true, "Caption is required"],
      trim: true,
      maxlength: [2000, "Caption cannot exceed 2000 characters"],
    },
    media: {
      type: [tripperMediaSchema],
      required: [true, "At least one media item is required"],
      validate: {
        validator: function (v: any[]) {
          return v && v.length > 0;
        },
        message: "Post must have at least one media item",
      },
    },
    location: {
      type: tripperLocationSchema,
      required: [true, "Location is required"],
    },
    tags: [tripperTagSchema],
    hashtags: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string) {
            return /^[\w]+$/.test(v);
          },
          message:
            "Hashtags must contain only letters, numbers, and underscores",
        },
        index: true,
      },
    ],
    likes: {
      type: Number,
      default: 0,
      min: [0, "Likes count cannot be negative"],
    },
    dislikes: {
      type: Number,
      default: 0,
      min: [0, "Dislikes count cannot be negative"],
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    dislikedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    comments: [tripperPostCommentSchema],
    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: [0, "View count cannot be negative"],
    },
    shareCount: {
      type: Number,
      default: 0,
      min: [0, "Share count cannot be negative"],
    },
    saveCount: {
      type: Number,
      default: 0,
      min: [0, "Save count cannot be negative"],
    },
    savedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    reportCount: {
      type: Number,
      default: 0,
      min: [0, "Report count cannot be negative"],
    },
    reportedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    reportReasons: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
tripperPostSchema.index({ createdAt: -1 });
tripperPostSchema.index({ "location.city": 1, "location.country": 1 });
tripperPostSchema.index({ likes: -1 });

// Virtuals
tripperPostSchema.virtual("commentCount").get(function () {
  return this.comments ? this.comments.length : 0;
});

tripperPostSchema.virtual("mediaCount").get(function () {
  return this.media ? this.media.length : 0;
});

tripperPostSchema.virtual("engagement").get(function () {
  return this.likes + this.comments.length + this.shareCount + this.saveCount;
});

// Methods

/**
 * Like a post
 * @param userId - ID of the user liking the post
 */
tripperPostSchema.methods.like = async function (
  userId: mongoose.Types.ObjectId
): Promise<TripperPostInterface> {
  // Check if already liked
  const alreadyLiked = this.likedBy.some((id: mongoose.Types.ObjectId) =>
    id.equals(userId)
  );
  if (alreadyLiked) return this;

  // Remove from dislikedBy if present
  const dislikeIndex = this.dislikedBy.findIndex(
    (id: mongoose.Types.ObjectId) => id.equals(userId)
  );
  if (dislikeIndex >= 0) {
    this.dislikedBy.splice(dislikeIndex, 1);
    this.dislikes = Math.max(0, this.dislikes - 1);
  }

  // Add to likedBy
  this.likedBy.push(userId);
  this.likes += 1;

  return this.save();
};

/**
 * Unlike a post
 * @param userId - ID of the user unliking the post
 */
tripperPostSchema.methods.unlike = async function (
  userId: mongoose.Types.ObjectId
): Promise<TripperPostInterface> {
  const likeIndex = this.likedBy.findIndex((id: mongoose.Types.ObjectId) =>
    id.equals(userId)
  );
  if (likeIndex >= 0) {
    this.likedBy.splice(likeIndex, 1);
    this.likes = Math.max(0, this.likes - 1);
  }

  return this.save();
};

/**
 * Dislike a post
 * @param userId - ID of the user disliking the post
 */
tripperPostSchema.methods.dislike = async function (
  userId: mongoose.Types.ObjectId
): Promise<TripperPostInterface> {
  // Check if already disliked
  const alreadyDisliked = this.dislikedBy.some((id: mongoose.Types.ObjectId) =>
    id.equals(userId)
  );
  if (alreadyDisliked) return this;

  // Remove from likedBy if present
  const likeIndex = this.likedBy.findIndex((id: mongoose.Types.ObjectId) =>
    id.equals(userId)
  );
  if (likeIndex >= 0) {
    this.likedBy.splice(likeIndex, 1);
    this.likes = Math.max(0, this.likes - 1);
  }

  // Add to dislikedBy
  this.dislikedBy.push(userId);
  this.dislikes += 1;

  return this.save();
};

/**
 * Undislike a post
 * @param userId - ID of the user undisliking the post
 */
tripperPostSchema.methods.undislike = async function (
  userId: mongoose.Types.ObjectId
): Promise<TripperPostInterface> {
  const dislikeIndex = this.dislikedBy.findIndex(
    (id: mongoose.Types.ObjectId) => id.equals(userId)
  );
  if (dislikeIndex >= 0) {
    this.dislikedBy.splice(dislikeIndex, 1);
    this.dislikes = Math.max(0, this.dislikes - 1);
  }

  return this.save();
};

/**
 * Add a comment to the post
 * @param userId - ID of the user commenting
 * @param text - Comment text
 */
tripperPostSchema.methods.addComment = async function (
  userId: mongoose.Types.ObjectId,
  text: string
): Promise<TripperPostCommentInterface> {
  const comment = {
    user: userId,
    text,
    likes: 0,
    likedBy: [],
  };

  this.comments.push(comment);
  await this.save();

  return this.comments[this.comments.length - 1];
};

/**
 * Increment view count
 */
tripperPostSchema.methods.incrementViewCount =
  async function (): Promise<TripperPostInterface> {
    this.viewCount += 1;
    return this.save();
  };

/**
 * Increment share count
 */
tripperPostSchema.methods.incrementShareCount =
  async function (): Promise<TripperPostInterface> {
    this.shareCount += 1;
    return this.save();
  };

/**
 * Save a post to user's saved collection
 * @param userId - ID of the user saving the post
 */
tripperPostSchema.methods.savePost = async function (
  userId: mongoose.Types.ObjectId
): Promise<TripperPostInterface> {
  // Check if already saved
  const alreadySaved = this.savedBy.some((id: mongoose.Types.ObjectId) =>
    id.equals(userId)
  );
  if (alreadySaved) return this;

  // Add to savedBy
  this.savedBy.push(userId);
  this.saveCount += 1;

  return this.save();
};

/**
 * Unsave a post
 * @param userId - ID of the user unsaving the post
 */
tripperPostSchema.methods.unsave = async function (
  userId: mongoose.Types.ObjectId
): Promise<TripperPostInterface> {
  const saveIndex = this.savedBy.findIndex((id: mongoose.Types.ObjectId) =>
    id.equals(userId)
  );
  if (saveIndex >= 0) {
    this.savedBy.splice(saveIndex, 1);
    this.saveCount = Math.max(0, this.saveCount - 1);
  }

  return this.save();
};

/**
 * Report a post
 * @param userId - ID of the user reporting the post
 * @param reason - Reason for reporting
 */
tripperPostSchema.methods.report = async function (
  userId: mongoose.Types.ObjectId,
  reason: string
): Promise<TripperPostInterface> {
  // Check if already reported
  const alreadyReported = this.reportedBy.some((id: mongoose.Types.ObjectId) =>
    id.equals(userId)
  );
  if (alreadyReported) return this;

  // Add to reportedBy
  this.reportedBy.push(userId);
  this.reportCount += 1;

  // Add reason if provided
  if (reason) {
    if (!this.reportReasons) this.reportReasons = [];
    this.reportReasons.push(reason);
  }

  return this.save();
};

// Statics

/**
 * Find popular posts
 */
tripperPostSchema.statics.findPopular = async function (
  limit: number = 10
): Promise<TripperPostInterface[]> {
  return this.find({ isPrivate: false, isArchived: false })
    .sort({ likes: -1, viewCount: -1, createdAt: -1 })
    .limit(limit)
    .populate("user", "firstName lastName username photo");
};

/**
 * Find posts by location
 */
tripperPostSchema.statics.findByLocation = async function (
  location: string
): Promise<TripperPostInterface[]> {
  return this.find({
    isPrivate: false,
    isArchived: false,
    $or: [
      { "location.name": { $regex: location, $options: "i" } },
      { "location.city": { $regex: location, $options: "i" } },
      { "location.country": { $regex: location, $options: "i" } },
    ],
  })
    .sort({ createdAt: -1 })
    .populate("user", "firstName lastName username photo");
};

/**
 * Find posts by user
 */
tripperPostSchema.statics.findByUser = async function (
  userId: mongoose.Types.ObjectId
): Promise<TripperPostInterface[]> {
  return this.find({ user: userId, isArchived: false })
    .sort({ createdAt: -1 })
    .populate("user", "firstName lastName username photo");
};

// Create or retrieve the model
let TripperPost: TripperPostModel;
try {
  TripperPost = mongoose.model<TripperPostInterface, TripperPostModel>(
    "TripperPost"
  );
} catch (error) {
  TripperPost = mongoose.model<TripperPostInterface, TripperPostModel>(
    "TripperPost",
    tripperPostSchema
  );
}

export default TripperPost;
