import { Elysia, t } from "elysia";
import ReviewController from "../controllers/ReviewController";

const reviewController = new ReviewController();

const reviewsRoutes = new Elysia({ prefix: "/api/v1/reviews" })
  .guard({
    detail: {
      tags: ["Reviews"],
      security: [{ BearerAuth: [] }],
      description: "Routes for managing reviews. Requires authentication.",
    },
  })
  .derive(async ({ headers, jwt_auth }) => {
    const auth = headers["authorization"];
    const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      throw new Error(
        JSON.stringify({
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Token is missing",
            },
          ],
        })
      );
    }

    try {
      const data = await jwt_auth.verify(token);
      return { userId: data?.id };
    } catch (error) {
      throw new Error(
        JSON.stringify({
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Invalid or expired token",
            },
          ],
        })
      );
    }
  })

  // Get all reviews with pagination
  .get(
    "/",
    async ({ query }) => {
      const {
        page = 1,
        limit = 10,
        status = "all",
        searchTerm,
        itemType,
        rating,
      } = query;

      return reviewController.getReviews({
        page,
        limit,
        status,
        searchTerm,
        itemType,
        rating,
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        status: t.Optional(t.String()),
        searchTerm: t.Optional(t.String()),
        itemType: t.Optional(t.String()),
        rating: t.Optional(t.Number()),
      }),
      detail: {
        summary: "Get all reviews",
        description: "Get all reviews with pagination and filtering",
      },
    }
  )

  // Get review by ID
  .get(
    "/:id",
    async ({ params: { id } }) => reviewController.getReviewById(id),
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get review by ID",
        description: "Get a specific review by its ID",
      },
    }
  )

  // Update review status
  .put(
    "/:id/status",
    async ({ params: { id }, body }) =>
      reviewController.updateReviewStatus(id, body.status),
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.String({
          enum: ["Published", "Pending", "Rejected"],
        }),
      }),
      detail: {
        summary: "Update review status",
        description: "Update the status of a review",
      },
    }
  )

  // Add reply to review
  .post(
    "/:id/reply",
    async ({ params: { id }, body, userId }) =>
      reviewController.replyToReview(id, {
        text: body.reply,
        respondedBy: userId,
      }),
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reply: t.String(),
      }),
      detail: {
        summary: "Reply to review",
        description: "Add an admin reply to a review",
      },
    }
  )

  // Get review statistics
  .get("/stats", async () => reviewController.getReviewStats(), {
    detail: {
      summary: "Get review statistics",
      description: "Get aggregated statistics about reviews",
    },
  });

export default reviewsRoutes;
