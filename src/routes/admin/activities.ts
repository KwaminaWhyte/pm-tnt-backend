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

  .get("/:id", ({ params: { id } }) => activityController.getActivityById(id), {
    detail: {
      summary: "Get activity by ID (Admin)",
      description: "Retrieve a specific activity by its ID for admin",
      tags: ["Activities - Admin"],
    },
  })

  .post("/", ({ body }) => activityController.createActivity(body), {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      destination: t.String(),
      duration: t.Number({ minimum: 0 }),
      price: t.Number({ minimum: 0 }),
      category: t.Enum({
        Adventure: "Adventure",
        Cultural: "Cultural",
        Nature: "Nature",
        Entertainment: "Entertainment",
      }),
      availability: t.Array(
        t.Object({
          dayOfWeek: t.Number({ minimum: 0, maximum: 6 }),
          startTime: t.String(),
          endTime: t.String(),
        })
      ),
      images: t.Optional(t.Array(t.String())),
      maxParticipants: t.Optional(t.Number({ minimum: 1 })),
      minParticipants: t.Optional(t.Number({ minimum: 1 })),
      requirements: t.Optional(t.Array(t.String())),
      included: t.Optional(t.Array(t.String())),
      excluded: t.Optional(t.Array(t.String())),
    }),
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
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        destination: t.Optional(t.String()),
        duration: t.Optional(t.Number({ minimum: 0 })),
        price: t.Optional(t.Number({ minimum: 0 })),
        category: t.Optional(
          t.Enum({
            Adventure: "Adventure",
            Cultural: "Cultural",
            Nature: "Nature",
            Entertainment: "Entertainment",
          })
        ),
        availability: t.Optional(
          t.Array(
            t.Object({
              dayOfWeek: t.Number({ minimum: 0, maximum: 6 }),
              startTime: t.String(),
              endTime: t.String(),
            })
          )
        ),
        images: t.Optional(t.Array(t.String())),
        maxParticipants: t.Optional(t.Number({ minimum: 1 })),
        minParticipants: t.Optional(t.Number({ minimum: 1 })),
        requirements: t.Optional(t.Array(t.String())),
        included: t.Optional(t.Array(t.String())),
        excluded: t.Optional(t.Array(t.String())),
      }),
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
