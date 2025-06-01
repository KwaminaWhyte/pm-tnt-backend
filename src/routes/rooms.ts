import { Elysia, t } from "elysia";
import RoomController from "~/controllers/RoomController";

const roomController = new RoomController();

/**
 * Room routes
 * Base path: /api/v1/rooms
 */
const roomRoutes = new Elysia({ prefix: "/api/v1/rooms" })

  // Get all rooms with filtering options
  .get(
    "/",
    async ({ query }) => {
      return roomController.getRooms(query);
    },
    {
      query: t.Object({
        isAvailable: t.Optional(t.String()),
        priceRange: t.Optional(t.String()), // Format: "min,max"
        roomType: t.Optional(t.String()),
        capacity: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get all rooms",
        description: "Retrieve all rooms with optional filtering",
        tags: ["Rooms"],
      },
    }
  )

  // Get room by ID
  .get(
    "/:id",
    async ({ params: { id } }) => {
      return roomController.getRoomById(id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get room by ID",
        description: "Retrieve a specific room by its ID",
        tags: ["Rooms"],
      },
    }
  )

  // Create new room
  .post(
    "/",
    async ({ body }) => {
      return roomController.createRoom(body);
    },
    {
      body: t.Object({
        hotel: t.String(), // Hotel ObjectId
        roomNumber: t.String(),
        floor: t.Optional(t.Number({ minimum: 0 })),
        roomType: t.String({
          enum: ["Single", "Double", "Twin", "Suite", "Deluxe", "Presidential"],
        }),
        pricePerNight: t.Number({ minimum: 0 }),
        capacity: t.Number({ minimum: 1, maximum: 20 }),
        features: t.Optional(t.Array(t.String())),
        images: t.Optional(t.Array(t.String())),
        description: t.Optional(t.String()),
        size: t.Optional(t.Number({ minimum: 0 })),
        bedType: t.Optional(t.String()),
        isAvailable: t.Optional(t.Boolean()),
        maintenanceStatus: t.Optional(
          t.String({
            enum: ["Available", "Cleaning", "Maintenance"],
          })
        ),
      }),
      detail: {
        summary: "Create new room",
        description: "Create a new room for a hotel",
        tags: ["Rooms"],
      },
    }
  )

  // Update room by ID
  .put(
    "/:id",
    async ({ params: { id }, body }) => {
      return roomController.updateRoom(id, body as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        roomNumber: t.Optional(t.String()),
        floor: t.Optional(t.Number({ minimum: 0 })),
        roomType: t.Optional(
          t.String({
            enum: [
              "Single",
              "Double",
              "Twin",
              "Suite",
              "Deluxe",
              "Presidential",
            ],
          })
        ),
        pricePerNight: t.Optional(t.Number({ minimum: 0 })),
        capacity: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
        features: t.Optional(t.Array(t.String())),
        images: t.Optional(t.Array(t.String())),
        description: t.Optional(t.String()),
        size: t.Optional(t.Number({ minimum: 0 })),
        bedType: t.Optional(t.String()),
        isAvailable: t.Optional(t.Boolean()),
        maintenanceStatus: t.Optional(
          t.String({
            enum: ["Available", "Cleaning", "Maintenance"],
          })
        ),
      }),
      detail: {
        summary: "Update room",
        description: "Update an existing room by ID",
        tags: ["Rooms"],
      },
    }
  )

  // Delete room by ID
  .delete(
    "/:id",
    async ({ params: { id } }) => {
      return roomController.deleteRoom(id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Delete room",
        description: "Delete a room by ID",
        tags: ["Rooms"],
      },
    }
  )

  // Get rooms by hotel ID
  .get(
    "/hotel/:hotelId",
    async ({ params: { hotelId }, query }) => {
      return roomController.getRoomsByHotelId(hotelId, query);
    },
    {
      params: t.Object({
        hotelId: t.String(),
      }),
      query: t.Object({
        isAvailable: t.Optional(t.String()),
        priceRange: t.Optional(t.String()),
        roomType: t.Optional(t.String()),
        capacity: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get rooms by hotel ID",
        description:
          "Retrieve all rooms for a specific hotel with optional filtering",
        tags: ["Rooms"],
      },
    }
  )

  // Update room availability
  .patch(
    "/:id/availability",
    async ({ params: { id }, body }) => {
      return roomController.updateRoomAvailability(id, body.isAvailable);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        isAvailable: t.Boolean(),
      }),
      detail: {
        summary: "Update room availability",
        description: "Update the availability status of a room",
        tags: ["Rooms"],
      },
    }
  )

  // Get room statistics for a hotel
  .get(
    "/hotel/:hotelId/stats",
    async ({ params: { hotelId } }) => {
      return roomController.getRoomStats(hotelId);
    },
    {
      params: t.Object({
        hotelId: t.String(),
      }),
      detail: {
        summary: "Get room statistics",
        description:
          "Get statistical information about rooms for a specific hotel",
        tags: ["Rooms"],
      },
    }
  );

export default roomRoutes;
