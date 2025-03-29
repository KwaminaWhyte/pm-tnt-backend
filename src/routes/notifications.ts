import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import NotificationController from "../controllers/NotificationController";

// Define routes for notifications
const notificationRoutes = new Elysia({ prefix: "/api/v1/notifications" })
  .use(jwtConfig)
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

      if (!data || typeof data === "boolean") {
        throw new Error("Invalid token data");
      }

      return { userId: data.id };
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
      const notificationController = new NotificationController();
      return notificationController.getUserNotifications(userId);
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "Get user notifications",
        description: "Retrieve all notifications for the authenticated user",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .patch(
    "/:id/read",
    async ({ params: { id }, userId }) => {
      const notificationController = new NotificationController();
      return notificationController.markAsRead(id, userId);
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        description: "Mark a specific notification as read",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .patch(
    "/mark-all-read",
    async ({ userId }) => {
      const notificationController = new NotificationController();
      return notificationController.markAllAsRead(userId);
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        description: "Mark all user's notifications as read",
        security: [{ bearerAuth: [] }],
      },
    }
  );

export default notificationRoutes;
