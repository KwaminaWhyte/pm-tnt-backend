import { Elysia } from "elysia";
import vehicleAdminRoutes from "./admin/vehicles";
import vehicleRoutes from "./users/vehicles";

/**
 * Main vehicles routes
 * Base path: /api/v1/vehicles
 */
const vehiclesRoutes = new Elysia({ prefix: "/api/v1/vehicles" })
  .use(vehicleAdminRoutes)
  .use(vehicleRoutes);

export default vehiclesRoutes;
