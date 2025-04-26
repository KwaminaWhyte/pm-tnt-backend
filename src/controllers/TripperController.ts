import TripperPost, { ITripperPost } from "../models/TripperPost";
import mongoose from "mongoose";
import { Context } from "elysia";

export class TripperController {
  // Get all tripper posts with optional filters
  async getAllPosts(
    context: Context<{
      query: {
        sort?: string;
        limit?: string;
        page?: string;
        type?: string;
        location?: string;
        userId?: string;
      };
    }>
  ) {
    try {
      const {
        sort = "createdAt",
        limit = "10",
        page = "1",
        type,
        location,
        userId,
      } = context.query;

      // Build filter query
      const filter: any = {};
      if (type) filter.mediaType = type;
      if (location) filter.location = { $regex: location, $options: "i" };
      if (userId) filter.user = userId;

      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Determine sort order
      let sortOption = {};
      switch (sort) {
        case "popular":
          sortOption = { likes: -1, createdAt: -1 };
          break;
        case "oldest":
          sortOption = { createdAt: 1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }

      const posts = await TripperPost.find(filter)
        .populate("user", "firstName lastName photo")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

      const totalPosts = await TripperPost.countDocuments(filter);
      const totalPages = Math.ceil(totalPosts / limitNum);

      return {
        status: true,
        data: posts,
        meta: {
          currentPage: pageNum,
          totalPages,
          totalCount: totalPosts,
          hasNextPage: pageNum < totalPages,
        },
      };
    } catch (error) {
      return {
        status: false,
        message: `Error fetching tripper posts: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // Get a specific post by ID
  async getPostById(context: Context<{ params: { id: string } }>) {
    try {
      const { id } = context.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return {
          status: false,
          message: "Invalid post ID format",
        };
      }

      const post = await TripperPost.findById(id).populate(
        "user",
        "firstName lastName photo"
      );

      if (!post) {
        return {
          status: false,
          message: "Post not found",
        };
      }

      return {
        status: true,
        data: post,
      };
    } catch (error) {
      return {
        status: false,
        message: `Error fetching post: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // Create a new post
  async createPost(
    context: Context<{
      body: {
        userId: string;
        userName: string;
        userAvatar: string;
        caption: string;
        mediaUrl: string;
        mediaType: "image" | "video";
        location: string;
      };
      userId: string;
    }>
  ) {
    try {
      const { caption, mediaUrl, mediaType, location, userAvatar } =
        context.body;

      // Use the authenticated userId from the context instead of the one from the body
      const userId = context.userId;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
          status: false,
          message: "Invalid user ID format",
        };
      }

      const newPost = new TripperPost({
        user: userId,
        userAvatar,
        caption,
        mediaUrl,
        mediaType,
        location,
        likes: 0,
        dislikes: 0,
        comments: [],
      });

      const savedPost = await newPost.save();
      const populatedPost = await TripperPost.findById(savedPost._id).populate(
        "user",
        "firstName lastName photo"
      );

      return {
        status: true,
        message: "Post created successfully",
        data: populatedPost,
      };
    } catch (error) {
      return {
        status: false,
        message: `Error creating post: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // Update post likes or dislikes
  async updateReactions(
    context: Context<{
      params: { id: string };
      body: { action: "like" | "dislike" };
      userId: string;
    }>
  ) {
    try {
      const { id } = context.params;
      const { action } = context.body;
      const userId = context.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return {
          status: false,
          message: "Invalid post ID format",
        };
      }

      const post = await TripperPost.findById(id);

      if (!post) {
        return {
          status: false,
          message: "Post not found",
        };
      }

      // Update likes or dislikes
      if (action === "like") {
        post.likes += 1;
      } else if (action === "dislike") {
        post.dislikes += 1;
      }

      await post.save();

      return {
        status: true,
        message: `Post ${action}d successfully`,
        data: post,
      };
    } catch (error) {
      return {
        status: false,
        message: `Error updating reactions: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // Add a comment to a post
  async addComment(
    context: Context<{
      params: { id: string };
      body: {
        userId: string;
        userName: string;
        userAvatar: string;
        text: string;
      };
      userId: string;
    }>
  ) {
    try {
      const { id } = context.params;
      const { text, userAvatar } = context.body;
      // Use the authenticated userId from the context
      const userId = context.userId;

      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return {
          status: false,
          message: "Invalid ID format",
        };
      }

      const post = await TripperPost.findById(id);

      if (!post) {
        return {
          status: false,
          message: "Post not found",
        };
      }

      // Create a comment using the proper format for the mongoose schema
      post.comments.push({
        user: new mongoose.Types.ObjectId(userId),
        userAvatar,
        text,
        likes: 0,
        createdAt: new Date(),
      } as any); // Using 'as any' to bypass type checking for now

      await post.save();

      return {
        status: true,
        message: "Comment added successfully",
        data: post,
      };
    } catch (error) {
      return {
        status: false,
        message: `Error adding comment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // Like a comment
  async likeComment(
    context: Context<{
      params: { id: string; commentId: string };
      userId: string;
    }>
  ) {
    try {
      const { id, commentId } = context.params;
      const userId = context.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return {
          status: false,
          message: "Invalid post ID format",
        };
      }

      const post = await TripperPost.findById(id);

      if (!post) {
        return {
          status: false,
          message: "Post not found",
        };
      }

      // Find comment by commentId (need to handle this differently since id() doesn't exist on Array)
      const commentIndex = post.comments.findIndex(
        (comment) => comment._id.toString() === commentId
      );

      if (commentIndex === -1) {
        return {
          status: false,
          message: "Comment not found",
        };
      }

      // Increment likes on the found comment
      post.comments[commentIndex].likes += 1;
      await post.save();

      return {
        status: true,
        message: "Comment liked successfully",
        data: post,
      };
    } catch (error) {
      return {
        status: false,
        message: `Error liking comment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // Delete a post
  async deletePost(
    context: Context<{
      params: { id: string };
      userId: string;
    }>
  ) {
    try {
      const { id } = context.params;
      const userId = context.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return {
          status: false,
          message: "Invalid post ID format",
        };
      }

      // First check if the post exists and belongs to the user
      const post = await TripperPost.findById(id);

      if (!post) {
        return {
          status: false,
          message: "Post not found",
        };
      }

      // Check if the user is the owner of the post
      if (post.user.toString() !== userId) {
        return {
          status: false,
          message: "Unauthorized: You can only delete your own posts",
        };
      }

      const deletedPost = await TripperPost.findByIdAndDelete(id);

      return {
        status: true,
        message: "Post deleted successfully",
      };
    } catch (error) {
      return {
        status: false,
        message: `Error deleting post: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
