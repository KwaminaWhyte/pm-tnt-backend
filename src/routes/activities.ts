import { Elysia } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import activityAdminRoutes from "./activities-admin";
import activityPublicRoutes from "./activities-public";

/**
 * Main activities routes
 * Base path: /api/v1/activities
 */
const activitiesRoutes = new Elysia({ prefix: "/api/v1/activities" })
  .use(jwtConfig) // Apply JWT middleware
  .use(activityAdminRoutes)
  .use(activityPublicRoutes);

export default activitiesRoutes;
