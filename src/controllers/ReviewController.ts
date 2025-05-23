import mongoose from "mongoose";
import Review, { ReviewInterface } from "~/models/Review";

interface ReviewQuery {
  page?: number;
  limit?: number;
  status?: string;
  searchTerm?: string;
  itemType?: string;
  rating?: number;
}

export default class ReviewController {
  /**
   * Get all reviews with pagination and filtering
   */
  async getReviews(query: ReviewQuery) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        searchTerm,
        itemType,
        rating,
      } = query;

      const skip = (page - 1) * limit;

      // Build query filters
      const filter: any = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (itemType && itemType !== "all") {
        filter.itemType = itemType;
      }

      if (rating) {
        filter.rating = rating;
      }

      // Add text search if searchTerm is provided
      if (searchTerm) {
        filter.$text = { $search: searchTerm };
      }

      // Execute the query with pagination
      const reviews = await Review.find(filter)
        .populate("user", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count for pagination
      const totalItems = await Review.countDocuments(filter);

      // Format reviews for the frontend
      const formattedReviews = reviews.map((review) => ({
        id: review._id.toString(),
        customerName:
          `${review.user?.firstName || ""} ${
            review.user?.lastName || ""
          }`.trim() || "Anonymous User",
        itemName: review.itemId?.toString() || "",
        itemType: this.capitalizeFirstLetter(review.itemType),
        rating: review.rating,
        comment: review.comment || "",
        datePosted: review.createdAt.toISOString(),
        helpful: review.helpful?.length || 0,
        flags: 0, // Placeholder for future implementation
        status: this.mapStatus(review.status),
      }));

      return {
        success: true,
        data: formattedReviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems,
          itemsPerPage: limit,
        },
      };
    } catch (error: any) {
      console.error("Error getting reviews:", error);
      throw new Error(
        JSON.stringify({
          message: "Failed to get reviews",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(id: string) {
    try {
      const review = await Review.findById(id)
        .populate("user", "firstName lastName email")
        .lean();

      if (!review) {
        throw new Error(
          JSON.stringify({
            message: "Review not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Review with the specified ID does not exist",
              },
            ],
          })
        );
      }

      return {
        review: {
          id: review._id.toString(),
          customerName:
            `${review.user?.firstName || ""} ${
              review.user?.lastName || ""
            }`.trim() || "Anonymous User",
          itemName: review.itemId?.toString() || "",
          itemType: this.capitalizeFirstLetter(review.itemType),
          rating: review.rating,
          comment: review.comment || "",
          datePosted: review.createdAt.toISOString(),
          helpful: review.helpful?.length || 0,
          flags: 0, // Placeholder for future implementation
          status: this.mapStatus(review.status),
        },
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to get review",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  /**
   * Update review status
   */
  async updateReviewStatus(id: string, status: string) {
    try {
      const mappedStatus = this.mapStatusToDatabase(status);

      const updatedReview = await Review.findByIdAndUpdate(
        id,
        { status: mappedStatus },
        { new: true }
      )
        .populate("user", "firstName lastName email")
        .lean();

      if (!updatedReview) {
        throw new Error(
          JSON.stringify({
            message: "Review not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Review with the specified ID does not exist",
              },
            ],
          })
        );
      }

      return {
        message: "Review status updated successfully",
        review: {
          id: updatedReview._id.toString(),
          customerName:
            `${updatedReview.user?.firstName || ""} ${
              updatedReview.user?.lastName || ""
            }`.trim() || "Anonymous User",
          itemName: updatedReview.itemId?.toString() || "",
          itemType: this.capitalizeFirstLetter(updatedReview.itemType),
          rating: updatedReview.rating,
          comment: updatedReview.comment || "",
          datePosted: updatedReview.createdAt.toISOString(),
          helpful: updatedReview.helpful?.length || 0,
          flags: 0,
          status: this.mapStatus(updatedReview.status),
        },
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to update review status",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  /**
   * Reply to a review
   */
  async replyToReview(
    id: string,
    { text, respondedBy }: { text: string; respondedBy: string }
  ) {
    try {
      const updatedReview = await Review.findByIdAndUpdate(
        id,
        {
          response: {
            text,
            respondedAt: new Date(),
            respondedBy: new mongoose.Types.ObjectId(respondedBy),
          },
        },
        { new: true }
      )
        .populate("user", "firstName lastName email")
        .lean();

      if (!updatedReview) {
        throw new Error(
          JSON.stringify({
            message: "Review not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Review with the specified ID does not exist",
              },
            ],
          })
        );
      }

      return {
        message: "Reply added successfully",
        review: {
          id: updatedReview._id.toString(),
          customerName:
            `${updatedReview.user?.firstName || ""} ${
              updatedReview.user?.lastName || ""
            }`.trim() || "Anonymous User",
          itemName: updatedReview.itemId?.toString() || "",
          itemType: this.capitalizeFirstLetter(updatedReview.itemType),
          rating: updatedReview.rating,
          comment: updatedReview.comment || "",
          datePosted: updatedReview.createdAt.toISOString(),
          helpful: updatedReview.helpful?.length || 0,
          flags: 0,
          status: this.mapStatus(updatedReview.status),
        },
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to add reply to review",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStats() {
    try {
      const [total, published, pending, rejected, ratingStats] =
        await Promise.all([
          Review.countDocuments(),
          Review.countDocuments({ status: "approved" }),
          Review.countDocuments({ status: "pending" }),
          Review.countDocuments({ status: "rejected" }),
          Review.aggregate([
            { $match: { status: "approved" } },
            { $group: { _id: null, avgRating: { $avg: "$rating" } } },
          ]),
        ]);

      const averageRating =
        ratingStats.length > 0 ? ratingStats[0].avgRating : 0;

      return {
        stats: {
          total,
          published,
          pending,
          rejected,
          averageRating: parseFloat(averageRating.toFixed(1)),
        },
      };
    } catch (error: any) {
      console.error("Error getting review stats:", error);
      throw new Error(
        JSON.stringify({
          message: "Failed to get review statistics",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  // Helper methods
  private mapStatus(status: string): "Published" | "Pending" | "Rejected" {
    switch (status) {
      case "approved":
        return "Published";
      case "pending":
        return "Pending";
      case "rejected":
        return "Rejected";
      default:
        return "Pending";
    }
  }

  private mapStatusToDatabase(
    status: string
  ): "approved" | "pending" | "rejected" {
    switch (status) {
      case "Published":
        return "approved";
      case "Pending":
        return "pending";
      case "Rejected":
        return "rejected";
      default:
        return "pending";
    }
  }

  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
