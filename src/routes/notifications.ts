import { Elysia, t } from "elysia";
import NotificationController from "../controllers/NotificationController";

const notificationController = new NotificationController();

// Define routes for notifications
const notificationRoutes = new Elysia({ prefix: "/api/v1/notifications" })
  .guard({
    detail: {
      tags: ["Notifications"],
      security: [{ BearerAuth: [] }],
      description:
        "Routes for managing notifications. Requires authentication.",
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
      if (!data) {
        throw new Error("Invalid token");
      }

      // Cast data.id to string to ensure compatible types
      return { userId: String(data.id) };
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
  .get(
    "/",
    async ({ userId }) => {
      return notificationController.getUserNotifications(userId);
    },
    {
      detail: {
        summary: "Get user notifications",
        description: "Retrieve all notifications for the authenticated user",
      },
    }
  )
  .patch(
    "/:id/read",
    async ({ params: { id }, userId }) => {
      return notificationController.markAsRead(id, userId);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Mark notification as read",
        description: "Mark a specific notification as read",
      },
    }
  )
  .patch(
    "/mark-all-read",
    async ({ userId }) => {
      return notificationController.markAllAsRead(userId);
    },
    {
      detail: {
        summary: "Mark all notifications as read",
        description: "Mark all user's notifications as read",
      },
    }
  );

export default notificationRoutes;
