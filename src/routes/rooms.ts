import { Elysia, t } from "elysia";
import RoomController from "../controllers/RoomController";

const roomController = new RoomController();

const roomRoutes = new Elysia({ prefix: "/api/v1/rooms" })

  .get("/", ({ query }) => roomController.getRooms(query), {
    query: t.Object({
      isAvailable: t.Optional(t.String()),
      priceRange: t.Optional(t.String()),
      roomType: t.Optional(t.String()),
      capacity: t.Optional(t.String()),
    }),
    detail: {
      summary: "Get all rooms",
      description: "Retrieve a list of rooms with optional filtering",
      tags: ["Rooms"],
      responses: {
        200: {
          description: "List of rooms retrieved successfully",
        },
        500: {
          description: "Error retrieving rooms",
        },
      },
    },
  })

  .get("/hotel/:hotelId", ({ params: { hotelId }, query }) => 
    roomController.getRoomsByHotelId(hotelId, query), {
    query: t.Object({
      isAvailable: t.Optional(t.String()),
      priceRange: t.Optional(t.String()),
      roomType: t.Optional(t.String()),
      capacity: t.Optional(t.String()),
    }),
    detail: {
      summary: "Get rooms by hotel ID",
      description: "Retrieve a list of rooms for a specific hotel with optional filtering",
      tags: ["Rooms"],
      responses: {
        200: {
          description: "List of hotel rooms retrieved successfully",
        },
        404: {
          description: "Hotel not found",
        },
        500: {
          description: "Error retrieving hotel rooms",
        },
      },
    },
  })

  .post("/", ({ body }) => roomController.createRoom(body), {
    detail: {
      summary: "Create a new room",
      description: "Add a new room to the system",
      tags: ["Rooms"],
      responses: {
        201: {
          description: "Room created successfully",
        },
        500: {
          description: "Error creating room",
        },
      },
    },
  });

export default roomRoutes;
