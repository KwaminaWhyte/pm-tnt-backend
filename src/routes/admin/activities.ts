import { Elysia, t } from "elysia";
import ActivityController from "~/controllers/ActivityController";

const activityController = new ActivityController();

/**
 * Activity routes for admin operations
 * Base path: /api/v1/activities/admin
 */
const activityAdminRoutes = new Elysia({ prefix: "/admin" })

  .guard({
    detail: {
      description: "Require admin privileges",
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
      const payload = data as Record<string, any>;

      const userId = payload.userId;

      if (!userId) {
        throw new Error("User ID not found in token");
      }

      return { userId };
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

  .get("/:id", ({ params: { id } }) => activityController.getActivityById(id), {
    detail: {
      summary: "Get activity by ID (Admin)",
      description: "Retrieve a specific activity by its ID for admin",
      tags: ["Activities - Admin"],
    },
  })

  .post("/", ({ body }) => activityController.createActivity(body), {
    detail: {
      summary: "Create activity (Admin)",
      description: "Create a new activity (Admin only)",
      tags: ["Activities - Admin"],
    },
  })

  .put(
    "/:id",
    ({ params: { id }, body }) => activityController.updateActivity(id, body),
    {
      detail: {
        summary: "Update activity (Admin)",
        description: "Update an existing activity (Admin only)",
        tags: ["Activities - Admin"],
      },
    }
  )

  .delete(
    "/:id",
    ({ params: { id } }) => activityController.deleteActivity(id),
    {
      detail: {
        summary: "Delete activity (Admin)",
        description: "Delete an activity by ID (Admin only)",
        tags: ["Activities - Admin"],
      },
    }
  )

  .get(
    "/destination/:destinationId",
    ({ params: { destinationId }, query }) =>
      activityController.getActivitiesByDestination(destinationId, {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        category: query.category as string,
      }),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        category: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get activities by destination (Admin)",
        description:
          "Retrieve activities associated with a specific destination (Admin only)",
        tags: ["Activities - Admin"],
      },
    }
  );

export default activityAdminRoutes;
