import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import HotelController from "../controllers/HotelController";

const hotelController = new HotelController();

/**
 * Hotel routes for managing hotel-related operations
 * Base path: /api/v1/hotels
 */
const hotelPublicRoutes = new Elysia({ prefix: "/api/v1/hotels/public" })

  .get(
    "/",
    async ({ query }) =>
      hotelController.getHotels({
        page: Number(query.page) || 1,
        searchTerm: query.searchTerm as string,
        limit: Number(query.limit) || 10,
        isAvailable: query.isAvailable === "true",
        city: query.city as string,
        country: query.country as string,
        sortBy: query.sortBy as "pricePerNight" | "capacity" | "rating",
        sortOrder: query.sortOrder as "asc" | "desc",
      }),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        searchTerm: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        isAvailable: t.Optional(t.String()),
        city: t.Optional(t.String()),
        country: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get all hotels",
        description:
          "Retrieve a list of hotels with optional filtering and pagination",
        tags: ["Hotels - Public"],
        responses: {
          200: {
            description: "List of hotels retrieved successfully",
          },
          400: {
            description: "Invalid query parameters",
          },
          401: {
            description: "Unauthorized - Invalid or missing token",
          },
        },
      },
    }
  )

  .get("/:id", ({ params: { id } }) => hotelController.getHotelById(id), {
    detail: {
      summary: "Get hotel by ID",
      description: "Retrieve a specific hotel by its ID",
      tags: ["Hotels - Public"],
      responses: {
        200: {
          description: "Hotel retrieved successfully",
        },
        404: {
          description: "Hotel not found",
        },
        401: {
          description: "Unauthorized - Invalid or missing token",
        },
      },
    },
  })

  .get(
    "/:id/availability",
    ({ params: { id }, query }) =>
      hotelController.getRoomAvailability(id, {
        checkIn: new Date(query.checkIn as string),
        checkOut: new Date(query.checkOut as string),
        guests: Number(query.guests),
      }),
    {
      query: t.Object({
        checkIn: t.String(),
        checkOut: t.String(),
        guests: t.String(),
      }),
      detail: {
        summary: "Get room availability",
        description:
          "Check room availability for specific dates and number of guests",
        tags: ["Hotels - Public", "Rooms"],
        responses: {
          200: {
            description: "Room availability retrieved successfully",
          },
          400: {
            description: "Invalid query parameters",
          },
          404: {
            description: "Hotel not found",
          },
        },
      },
    }
  )

  .get(
    "/nearby",
    ({ query }) =>
      hotelController.getNearbyHotels({
        latitude: Number(query.latitude),
        longitude: Number(query.longitude),
        radius: query.radius ? Number(query.radius) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      }),
    {
      query: t.Object({
        latitude: t.String(),
        longitude: t.String(),
        radius: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get nearby hotels",
        description:
          "Find hotels within a specified radius of given coordinates",
        tags: ["Hotels - Public", "Search"],
        responses: {
          200: {
            description: "Nearby hotels retrieved successfully",
          },
          400: {
            description: "Invalid coordinates",
          },
        },
      },
    }
  )

  .get("/", async ({ query }) => hotelController.getHotels(query), {
    detail: {
      summary: "Get all hotels with pagination and filtering",
      tags: ["Hotels - Public"],
      responses: {
        200: {
          description: "List of hotels with pagination",
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
      city: t.Optional(t.String()),
      country: t.Optional(t.String()),
      sortBy: t.Optional(t.Union([t.Literal("pricePerNight"), t.Literal("capacity"), t.Literal("rating")])),
      sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")]))
    })
  })

export default hotelPublicRoutes;
