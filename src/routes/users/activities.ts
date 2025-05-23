import { Elysia, t } from "elysia";
import ActivityController from "~/controllers/ActivityController";

const activityController = new ActivityController();

/**
 * Activity routes for public access
 * Base path: /api/v1/activities/public
 */
const activityRoutes = new Elysia()

  .get(
    "/",
    async ({ query }) =>
      activityController.getActivities({
        page: Number(query.page) || 1,
        searchTerm: query.searchTerm as string,
        limit: Number(query.limit) || 10,
        category: query.category as string,
        destination: query.destination as string,
        minPrice: query.minPrice ? Number(query.minPrice) : undefined,
        maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
        minDuration: query.minDuration ? Number(query.minDuration) : undefined,
        maxDuration: query.maxDuration ? Number(query.maxDuration) : undefined,
        sortBy: query.sortBy as "price" | "duration" | "name",
        sortOrder: query.sortOrder as "asc" | "desc",
      }),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        searchTerm: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        category: t.Optional(t.String()),
        destination: t.Optional(t.String()),
        minPrice: t.Optional(t.String()),
        maxPrice: t.Optional(t.String()),
        minDuration: t.Optional(t.String()),
        maxDuration: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get all activities (Public)",
        description:
          "Retrieve a list of activities with optional filtering and pagination",
        tags: ["Activities - Public"],
      },
    }
  )

  .get("/:id", ({ params: { id } }) => activityController.getActivityById(id), {
    detail: {
      summary: "Get activity by ID (Public)",
      description: "Retrieve a specific activity by its ID",
      tags: ["Activities - Public"],
    },
  })

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
        summary: "Get activities by destination (Public)",
        description:
          "Retrieve activities associated with a specific destination",
        tags: ["Activities - Public"],
      },
    }
  );

export default activityRoutes;
