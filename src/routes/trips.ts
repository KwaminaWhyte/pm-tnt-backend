import { Elysia, t } from "elysia";
import TripController from "../controllers/TripController";
// import { authenticateUser } from "../middleware/auth";

const tripController = new TripController();

const tripsRoutes = new Elysia({ prefix: "/api/v1/trips" })
  .get(
    "/",
    async ({ query, user }) => {
      const { page, limit, status, startDate, endDate } = query;
      return tripController.getTrips(user._id, {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 10,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Get all trips for the authenticated user",
        description: "Retrieve a paginated list of trips with optional filters",
      },
    }
  )
  .post(
    "/",
    async ({ body, user }) => {
      return tripController.createTrip(user._id, body);
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        startDate: t.String(),
        endDate: t.String(),
        destinations: t.Array(
          t.Object({
            destinationId: t.String(),
            order: t.Number(),
            stayDuration: t.Number(),
          })
        ),
        budget: t.Object({
          total: t.Number(),
        }),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Create a new trip",
        description: "Create a new trip with basic details",
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, user }) => {
      return tripController.getTrip(user._id, id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Get a trip by ID",
        description: "Retrieve detailed information about a specific trip",
      },
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      return tripController.updateTrip(user._id, id, body);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        status: t.Optional(
          t.Union([
            t.Literal("Draft"),
            t.Literal("Planned"),
            t.Literal("InProgress"),
            t.Literal("Completed"),
            t.Literal("Cancelled"),
          ])
        ),
        notes: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Update a trip",
        description: "Update trip details",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      return tripController.deleteTrip(user._id, id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Delete a trip",
        description: "Delete a trip and all its associated data",
      },
    }
  )
  .post(
    "/:id/accommodations",
    async ({ params: { id }, body, user }) => {
      return tripController.addAccommodation(user._id, id, body);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        hotelId: t.String(),
        roomIds: t.Array(t.String()),
        checkIn: t.String(),
        checkOut: t.String(),
        specialRequests: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Add accommodation to a trip",
        description: "Add hotel accommodation details to a trip",
      },
    }
  )
  .post(
    "/:id/transportation",
    async ({ params: { id }, body, user }) => {
      return tripController.addTransportation(user._id, id, body);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        vehicleId: t.Optional(t.String()),
        type: t.Union([
          t.Literal("Flight"),
          t.Literal("Train"),
          t.Literal("Bus"),
          t.Literal("RentalCar"),
          t.Literal("Own"),
        ]),
        details: t.Object({
          from: t.String(),
          to: t.String(),
          departureTime: t.Optional(t.String()),
          arrivalTime: t.Optional(t.String()),
          bookingReference: t.Optional(t.String()),
        }),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Add transportation to a trip",
        description: "Add transportation details to a trip",
      },
    }
  )
  .post(
    "/:id/activities",
    async ({ params: { id }, body, user }) => {
      return tripController.addActivity(user._id, id, body);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        location: t.Object({
          name: t.String(),
          coordinates: t.Optional(
            t.Object({
              latitude: t.Number(),
              longitude: t.Number(),
            })
          ),
        }),
        date: t.String(),
        duration: t.Number(),
        cost: t.Number(),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Add activity to a trip",
        description: "Add an activity to a trip's itinerary",
      },
    }
  )
  .post(
    "/:id/meals",
    async ({ params: { id }, body, user }) => {
      return tripController.addMeal(user._id, id, body);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        type: t.Union([
          t.Literal("Breakfast"),
          t.Literal("Lunch"),
          t.Literal("Dinner"),
        ]),
        date: t.String(),
        venue: t.Optional(t.String()),
        isIncluded: t.Boolean(),
        preferences: t.Optional(t.Array(t.String())),
      }),
      detail: {
        tags: ["Trips"],
        summary: "Add meal to a trip",
        description: "Add meal details to a trip's itinerary",
      },
    }
  );

export default tripsRoutes;
