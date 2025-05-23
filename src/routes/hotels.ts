import { Elysia } from "elysia";
import hotelAdminRoutes from "./admin/hotels";
import hotelRoutes from "./users/hotels";

/**
 * Main hotels routes
 * Base path: /api/v1/hotels
 */
const hotelsRoutes = new Elysia({ prefix: "/api/v1/hotels" })
  .use(hotelAdminRoutes)
  .use(hotelRoutes);

export default hotelsRoutes;
