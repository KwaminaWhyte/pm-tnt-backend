import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import VehicleController from "../controllers/VehicleController";
import BookingController from "../controllers/BookingController";

const vehicleController = new VehicleController();

const vehiclePublicRoutes = new Elysia({ prefix: "/api/v1/vehicles/public" })

  .get(
    "/",
    async ({ query }) => {
      const {
        page = 1,
        limit = 10,
        searchTerm,
        vehicleType,
        city,
        country,
        minPrice,
        maxPrice,
        capacity,
        isAvailable,
        sortBy,
        sortOrder,
      } = query;

      const priceRange =
        minPrice || maxPrice
          ? {
              min: minPrice || 0,
              max: maxPrice || Number.MAX_SAFE_INTEGER,
            }
          : undefined;

      return vehicleController.getVehicles({
        page,
        limit,
        searchTerm,
        vehicleType,
        city,
        country,
        capacity,
        isAvailable,
        priceRange,
        sortBy,
        sortOrder,
      });
    },
    {
      detail: {
        summary: "List all vehicles",
        tags: ["Vehicles - Public"],
        responses: {
          200: {
            description: "List of vehicles with pagination",
            content: {
              "application/json": {
                schema: t.Object({
                  success: t.Boolean(),
                  data: t.Array(t.Any()),
                  pagination: t.Object({
                    currentPage: t.Number(),
                    totalPages: t.Number(),
                    totalItems: t.Number(),
                    itemsPerPage: t.Number()
                  })
                })
              }
            }
          }
        }
      },
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        searchTerm: t.Optional(t.String()),
        vehicleType: t.Optional(t.String()),
        city: t.Optional(t.String()),
        country: t.Optional(t.String()),
        minPrice: t.Optional(t.Number()),
        maxPrice: t.Optional(t.Number()),
        capacity: t.Optional(t.Number()),
        isAvailable: t.Optional(
          t.Boolean({
            default: true,
          })
        ),
        sortBy: t.Optional(
          t.Union([
            t.Literal("pricePerDay"),
            t.Literal("capacity"),
            t.Literal("rating"),
          ])
        ),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
    }
  )
  .get("/:id", async ({ params: { id } }) => vehicleController.getVehicle(id), {
    detail: {
      summary: "Get vehicle details",
      tags: ["Vehicles - Public"],
    },
    params: t.Object({
      id: t.String(),
    }),
  })
  .post(
    "/:id/rate",
    async ({ params: { id }, body, userId }) =>
      vehicleController.rateVehicle(id, body, userId),
    {
      detail: {
        summary: "Rate a vehicle",
        tags: ["Vehicles - Public"],
      },
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        rating: t.Number({ minimum: 1, maximum: 5 }),
        comment: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id/availability",
    async ({ params: { id }, query }) =>
      vehicleController.checkAvailability(id, {
        startDate: new Date(query.startDate as string),
        endDate: new Date(query.endDate as string),
        insuranceOption: query.insuranceOption as string,
      }),
    {
      detail: {
        summary: "Check vehicle availability",
        tags: ["Vehicles - Public"],
      },
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        startDate: t.String(),
        endDate: t.String(),
        insuranceOption: t.Optional(t.String()),
      }),
    }
  );

export default vehiclePublicRoutes;
