import TripperPost, { ITripperPost } from "~/models/TripperPost";
import User from "~/models/User";
import mongoose from "mongoose";
import { Context } from "elysia";

// Define the interface we need since it's missing
interface UserInterface {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  photo?: string;
  [key: string]: any;
}

// Define custom context with userId
interface AuthContext {
  body: any;
  params?: any;
  query?: any;
  userId: string;
}

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
        user,
        userId,
      } = context.query;

      // Build filter query
      const filter: any = {};
      if (type) filter["media.type"] = type;
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
        .populate("comments.user", "firstName lastName photo")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

      const totalPosts = await TripperPost.countDocuments(filter);
      const totalPages = Math.ceil(totalPosts / limitNum);

      // Get unique countries from all posts
      const uniqueCountries = await TripperPost.distinct("location");

      // Get unique users count
      const uniqueUsers = await TripperPost.distinct("user");
      const uniqueUsersCount = uniqueUsers.length;

      // Add hasLiked property if userId is provided
      let formattedPosts = posts;

      if (userId) {
        formattedPosts = posts.map((post) => {
          const postObj = post.toObject();
          postObj.hasLiked =
            post.likedBy &&
            post.likedBy.some((id: any) => id.toString() === userId);
          return postObj;
        });
      }

      return {
        status: true,
        data: formattedPosts,
        meta: {
          currentPage: pageNum,
          totalPages,
          totalCount: totalPosts,
          hasNextPage: pageNum < totalPages,
          uniqueUsersCount,
          uniqueCountriesCount: uniqueCountries.length,
          uniqueCountries,
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
  async getPostById(
    context: Context<{
      params: { id: string };
      query: { userId: string };
    }>
  ) {
    try {
      const { id } = context.params;
      const userId = context.query.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return {
          status: false,
          message: "Invalid post ID format",
        };
      }

      const post = await TripperPost.findById(id)
        .populate("user", "firstName lastName photo")
        .populate("comments.user", "firstName lastName photo");

      if (!post) {
        return {
          status: false,
          message: "Post not found",
        };
      }

      const postObj = post.toObject();
      postObj.hasLiked =
        post.likedBy &&
        post.likedBy.some((id: any) => id.toString() === userId);

      return {
        status: true,
        data: postObj,
      };
    } catch (error: any) {
      return {
        status: false,
        message: `Error fetching post: ${error.message}`,
      };
    }
  }

  // Create a new post
  async createPost(context: AuthContext) {
    try {
      console.log(
        "Creating post with context:",
        JSON.stringify(
          {
            body: context.body,
            userId: context.userId,
          },
          null,
          2
        )
      );

      const { caption, media, location } = context.body;
      const userId = context.userId;

      if (!userId) {
        console.error("Missing userId in context");
        return {
          status: false,
          message: "User ID is required",
        };
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error(`Invalid user ID format: ${userId}`);
        return {
          status: false,
          message: "Invalid user ID format",
        };
      }

      // Validate media array
      if (!Array.isArray(media) || media.length === 0) {
        return {
          status: false,
          message: "At least one media item is required",
        };
      }

      // Check if each media item has the required properties
      for (const item of media) {
        if (
          !item.url ||
          !item.type ||
          !["image", "video"].includes(item.type)
        ) {
          return {
            status: false,
            message:
              "Each media item must have a valid url and type (image or video)",
          };
        }
      }

      console.log(
        `Creating post for user ${userId} with ${media.length} media items`
      );

      const newPost = new TripperPost({
        user: userId,
        caption,
        media,
        location,
        likes: 0,
        dislikes: 0,
        comments: [],
      });

      console.log(
        "Attempting to save post with data:",
        JSON.stringify(
          {
            user: userId,
            caption,
            media,
            location,
          },
          null,
          2
        )
      );

      const savedPost = await newPost.save();
      console.log("Post saved successfully with ID:", savedPost._id);

      // Return the saved post without trying to populate
      return {
        status: true,
        message: "Post created successfully",
        data: savedPost,
      };
    } catch (error: any) {
      console.error("Error in createPost:", error);
      return {
        status: false,
        message: `Error creating post: ${error.message}`,
        error: error.stack,
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

      // Check if user has already reacted to the post

      const alreadyLiked =
        post.likedBy && post.likedBy.some((id) => id.toString() === userId);

      if (alreadyLiked) {
        // User already liked this post, remove their like
        post.likes = Math.max(0, post.likes - 1);
        post.likedBy = post.likedBy.filter((id) => id.toString() !== userId);

        await post.save();

        return {
          status: true,
          message: "Like removed successfully",
          data: {
            ...post.toObject(),
            hasLiked: false,
          },
        };
      } else {
        // New like - add user to likedBy array
        post.likes += 1;

        // Initialize likedBy array if it doesn't exist
        if (!post.likedBy) {
          post.likedBy = [];
        }

        // Add user to likedBy
        post.likedBy.push(userId as any);

        // If the user previously disliked, remove from dislikedBy
        if (
          post.dislikedBy &&
          post.dislikedBy.some((id) => id.toString() === userId)
        ) {
          post.dislikes = Math.max(0, post.dislikes - 1);
          post.dislikedBy = post.dislikedBy.filter(
            (id) => id.toString() !== userId
          );
        }
      }

      await post.save();

      // Populate user information
      const populatedPost = await TripperPost.findById(id).populate(
        "user",
        "firstName lastName photo"
      );

      // Add hasLiked and hasDisliked flags for the requesting user
      const result = populatedPost?.toObject();
      result.hasLiked =
        populatedPost?.likedBy?.some((id) => id.toString() === userId) || false;
      result.hasDisliked =
        populatedPost?.dislikedBy?.some((id) => id.toString() === userId) ||
        false;

      return {
        status: true,
        message: `Post ${
          action === "like" ? "liked" : "disliked"
        } successfully`,
        data: result,
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
