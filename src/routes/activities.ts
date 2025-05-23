import { Elysia } from "elysia";
import activityAdminRoutes from "./admin/activities";
import activityRoutes from "./users/activities";

/**
 * Main activities routes
 * Base path: /api/v1/activities
 */
const activitiesRoutes = new Elysia({ prefix: "/api/v1/activities" })
  .use(activityAdminRoutes)
  .use(activityRoutes);

export default activitiesRoutes;
