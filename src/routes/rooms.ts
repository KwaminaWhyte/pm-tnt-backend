import { Elysia, t } from "elysia";
import RoomController from "../controllers/RoomController";

const roomController = new RoomController();

const roomRoutes = new Elysia({ prefix: "/api/v1/rooms" })

  .get("/", async ({ query, res }) => {
    try {
      await roomController.getRooms(query, res);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving rooms", error });
    }
  }, {
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

  .post("/", async ({ body, res }) => {
    try {
      await roomController.createRoom(body, res);
    } catch (error) {
      res.status(500).json({ message: "Error creating room", error });
    }
  }, {
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
