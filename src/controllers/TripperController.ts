import TripperPost, { ITripperPost } from "../models/TripperPost";
import User from "../models/User";
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
        user?: string;
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
        user,
      } = context.query;

      // Build filter query
      const filter: any = {};
      if (type) filter.mediaType = type;
      if (location) filter.location = { $regex: location, $options: "i" };
      if (user) filter.user = user;

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
    } catch (error: any) {
      return {
        status: false,
        message: `Error fetching tripper posts: ${error.message}`,
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
    } catch (error: any) {
      return {
        status: false,
        message: `Error fetching post: ${error.message}`,
      };
    }
  }

  // Create a new post
  async createPost(
    context: Context<{
      body: {
        caption: string;
        mediaUrl: string;
        mediaType: "image" | "video";
        location: string;
      };
      userId: string;
    }>
  ) {
    try {
      const { caption, mediaUrl, mediaType, location } = context.body;

      const userId = context.userId;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
          status: false,
          message: "Invalid user ID format",
        };
      }

      const newPost = new TripperPost({
        user: userId,
        caption,
        mediaUrl,
        mediaType,
        location,
        likes: 0,
        dislikes: 0,
        comments: [],
      });

      const savedPost = await newPost.save();

      // Populate user information before returning
      const populatedPost = await TripperPost.findById(savedPost._id).populate(
        "user",
        "firstName lastName photo"
      );

      return {
        status: true,
        message: "Post created successfully",
        data: populatedPost,
      };
    } catch (error: any) {
      return {
        status: false,
        message: `Error creating post: ${error.message}`,
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

      // Populate user information
      const populatedPost = await TripperPost.findById(id).populate(
        "user",
        "firstName lastName photo"
      );

      return {
        status: true,
        message: `Post ${action}d successfully`,
        data: populatedPost,
      };
    } catch (error: any) {
      return {
        status: false,
        message: `Error updating reactions: ${error.message}`,
      };
    }
  }

  // Add a comment to a post
  async addComment(
    context: Context<{
      params: { id: string };
      body: {
        text: string;
      };
      userId: string;
    }>
  ) {
    try {
      const { id } = context.params;
      const { text } = context.body;
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

      const newComment = {
        user: userId,
        text,
        likes: 0,
      };

      post.comments.push(newComment as any);
      await post.save();

      // Populate user information
      const populatedPost = await TripperPost.findById(id)
        .populate("user", "firstName lastName photo")
        .populate("comments.user", "firstName lastName photo");

      return {
        status: true,
        message: "Comment added successfully",
        data: populatedPost,
      };
    } catch (error: any) {
      return {
        status: false,
        message: `Error adding comment: ${error.message}`,
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

      // Find the comment by ID
      const comment = post.comments.find(
        (comment) => comment._id.toString() === commentId
      );

      if (!comment) {
        return {
          status: false,
          message: "Comment not found",
        };
      }

      comment.likes += 1;
      await post.save();

      // Populate user information
      const populatedPost = await TripperPost.findById(id)
        .populate("user", "firstName lastName photo")
        .populate("comments.user", "firstName lastName photo");

      return {
        status: true,
        message: "Comment liked successfully",
        data: populatedPost,
      };
    } catch (error: any) {
      return {
        status: false,
        message: `Error liking comment: ${error.message}`,
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

      // First check if post exists and is owned by the user
      const post = await TripperPost.findById(id);

      if (!post) {
        return {
          status: false,
          message: "Post not found",
        };
      }

      if (post.user.toString() !== userId) {
        return {
          status: false,
          message: "You are not authorized to delete this post",
        };
      }

      // Now delete the post
      const deletedPost = await TripperPost.findByIdAndDelete(id);

      return {
        status: true,
        message: "Post deleted successfully",
      };
    } catch (error: any) {
      return {
        status: false,
        message: `Error deleting post: ${error.message}`,
      };
    }
  }
}
