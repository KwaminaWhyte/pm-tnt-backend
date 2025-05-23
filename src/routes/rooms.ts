import { Elysia, t } from "elysia";
import RoomController from "~/controllers/RoomController";

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
    },
  })

  .get(
    "/hotel/:hotelId",
    ({ params: { hotelId }, query }) =>
      roomController.getRoomsByHotelId(hotelId, query),
    {
      query: t.Object({
        isAvailable: t.Optional(t.String()),
        priceRange: t.Optional(t.String()),
        roomType: t.Optional(t.String()),
        capacity: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get rooms by hotel ID",
        description:
          "Retrieve a list of rooms for a specific hotel with optional filtering",
        tags: ["Rooms"],
      },
    }
  )

  .post("/", ({ body }) => roomController.createRoom(body), {
    detail: {
      summary: "Create a new room",
      description: "Add a new room to the system",
      tags: ["Rooms"],
    },
  });

export default roomRoutes;
