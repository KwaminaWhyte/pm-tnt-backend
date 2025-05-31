import { Elysia, t } from "elysia";
import VehicleController from "~/controllers/VehicleController";
import BookingController from "~/controllers/BookingController";

const vehicleController = new VehicleController();

const vehicleRoutes = new Elysia()
  .get(
    "/",
    async ({ query }) => {
      // Convert and parse parameters for controller
      const parsedQuery: Record<string, any> = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
        searchTerm: query.searchTerm || undefined,
      };

      // Handle capacity - must be numeric
      if (query.capacity) {
        parsedQuery.capacity = parseInt(query.capacity);
      }

      // Handle vehicle type
      if (query.vehicleType) {
        parsedQuery.vehicleType = query.vehicleType;
      }

      // Handle sorting options
      if (query.sortBy) {
        parsedQuery.sortBy = query.sortBy;
      }

      if (query.sortOrder) {
        parsedQuery.sortOrder = query.sortOrder;
      }

      // Handle price range
      if (query.minPrice || query.maxPrice) {
        parsedQuery.priceRange = {
          min: query.minPrice ? parseInt(query.minPrice) : 0,
          max: query.maxPrice
            ? parseInt(query.maxPrice)
            : Number.MAX_SAFE_INTEGER,
        };
      }

      // Handle location filters
      if (query.city) {
        parsedQuery.city = query.city;
      }

      if (query.country) {
        parsedQuery.country = query.country;
      }

      // Handle availability as a boolean
      if (query.isAvailable !== undefined) {
        parsedQuery.isAvailable = query.isAvailable === "true";
      }

      // Handle transmission filter
      if (query.transmission) {
        parsedQuery.transmission = query.transmission;
      }

      // Handle fuel type filter
      if (query.fuelType) {
        parsedQuery.fuelType = query.fuelType;
      }

      // Handle features filter
      if (query.features) {
        parsedQuery.features = Array.isArray(query.features)
          ? query.features
          : [query.features];
      }

      return vehicleController.getVehicles(parsedQuery);
    },
    {
      detail: {
        summary: "Get all vehicles with advanced filtering",
        tags: ["Vehicles - Public"],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        searchTerm: t.Optional(t.String()),
        isAvailable: t.Optional(t.String()),
        minPrice: t.Optional(t.String()),
        maxPrice: t.Optional(t.String()),
        vehicleType: t.Optional(t.String()),
        city: t.Optional(t.String()),
        country: t.Optional(t.String()),
        capacity: t.Optional(t.String()),
        transmission: t.Optional(
          t.Union([t.Literal("Automatic"), t.Literal("Manual")])
        ),
        fuelType: t.Optional(
          t.Union([
            t.Literal("Petrol"),
            t.Literal("Diesel"),
            t.Literal("Electric"),
            t.Literal("Hybrid"),
          ])
        ),
        features: t.Optional(t.Union([t.String(), t.Array(t.String())])),
        sortBy: t.Optional(
          t.Union([
            t.Literal("pricePerDay"),
            t.Literal("capacity"),
            t.Literal("rating"),
            t.Literal("year"),
          ])
        ),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
    }
  )
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
      return { userId: data.id as string };
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
  .guard({
    detail: {
      description: "Require user to be logged in",
    },
  })
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
      summary: "Get vehicle by ID",
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
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        insuranceOption: query.insuranceOption,
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
  )
  .get(
    "/:id/pricing",
    async ({ params: { id }, query }) =>
      vehicleController.calculatePricing(id, {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        insuranceOption: query.insuranceOption,
      }),
    {
      detail: {
        summary: "Calculate vehicle rental pricing",
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
  )
  .get(
    "/nearby",
    async ({ query }) =>
      vehicleController.getNearbyVehicles({
        latitude: parseFloat(query.latitude),
        longitude: parseFloat(query.longitude),
        radius: query.radius ? parseFloat(query.radius) : 50,
        limit: query.limit ? parseInt(query.limit) : 20,
      }),
    {
      detail: {
        summary: "Get nearby vehicles",
        tags: ["Vehicles - Public"],
      },
      query: t.Object({
        latitude: t.String(),
        longitude: t.String(),
        radius: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get("/filters", async () => vehicleController.getFilterOptions(), {
    detail: {
      summary: "Get available filter options",
      tags: ["Vehicles - Public"],
    },
  })
  .get(
    "/bookings/history",
    async ({ userId }) => {
      const bookingController = new BookingController();
      return bookingController.getBookings({
        userId,
        serviceType: "vehicle",
      });
    },
    {
      detail: {
        summary: "Get vehicle booking history",
        tags: ["Vehicles - Auth User"],
      },
    }
  );

export default vehicleRoutes;
