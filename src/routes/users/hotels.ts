import { Elysia, t } from "elysia";
import HotelController from "~/controllers/HotelController";

const hotelController = new HotelController();

/**
 * Hotel routes for managing hotel-related operations
 * Base path: /api/v1/hotels
 */
const hotelRoutes = new Elysia()

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
        minPrice: query.minPrice ? Number(query.minPrice) : undefined,
        maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
        starRating: query.starRating ? Number(query.starRating) : undefined,
        amenities: query.amenities
          ? Array.isArray(query.amenities)
            ? query.amenities
            : [query.amenities]
          : undefined,
        sortBy: query.sortBy as
          | "pricePerNight"
          | "capacity"
          | "rating"
          | "starRating",
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
        minPrice: t.Optional(t.String()),
        maxPrice: t.Optional(t.String()),
        starRating: t.Optional(t.String()),
        amenities: t.Optional(t.Union([t.String(), t.Array(t.String())])),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get all hotels with advanced filtering",
        description:
          "Retrieve a list of hotels with optional filtering and pagination",
        tags: ["Hotels - Public"],
      },
    }
  )

  .get("/:id", ({ params: { id } }) => hotelController.getHotelById(id), {
    detail: {
      summary: "Get hotel by ID",
      description: "Retrieve a specific hotel by its ID",
      tags: ["Hotels - Public"],
    },
    params: t.Object({
      id: t.String(),
    }),
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
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get room availability",
        description:
          "Check room availability for specific dates and number of guests",
        tags: ["Hotels - Public", "Rooms"],
      },
    }
  )

  .get(
    "/:id/rooms",
    ({ params: { id }, query }) =>
      hotelController.getHotelRooms(id, {
        checkIn: query.checkIn ? new Date(query.checkIn as string) : undefined,
        checkOut: query.checkOut
          ? new Date(query.checkOut as string)
          : undefined,
        guests: query.guests ? Number(query.guests) : undefined,
        roomType: query.roomType as string,
      }),
    {
      query: t.Object({
        checkIn: t.Optional(t.String()),
        checkOut: t.Optional(t.String()),
        guests: t.Optional(t.String()),
        roomType: t.Optional(t.String()),
      }),
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get hotel rooms",
        description: "Get available rooms for a hotel with optional filtering",
        tags: ["Hotels - Public", "Rooms"],
      },
    }
  )

  .get(
    "/:id/pricing",
    ({ params: { id }, query }) =>
      hotelController.calculatePricing(id, {
        checkIn: new Date(query.checkIn as string),
        checkOut: new Date(query.checkOut as string),
        guests: Number(query.guests),
        roomType: query.roomType as string,
      }),
    {
      query: t.Object({
        checkIn: t.String(),
        checkOut: t.String(),
        guests: t.String(),
        roomType: t.Optional(t.String()),
      }),
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Calculate hotel pricing",
        description:
          "Calculate pricing for hotel stay based on dates and room type",
        tags: ["Hotels - Public", "Pricing"],
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
      },
    }
  )

  .get("/filters", () => hotelController.getFilterOptions(), {
    detail: {
      summary: "Get hotel filter options",
      description:
        "Get available filter options for hotels (amenities, star ratings, etc.)",
      tags: ["Hotels - Public", "Filters"],
    },
  });

export default hotelRoutes;
