import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import VehicleController from "../controllers/VehicleController";
import BookingController from "../controllers/BookingController";

const vehicleController = new VehicleController();

const vehicleRoutes = new Elysia({ prefix: "/api/v1/vehicles" })
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
      return { userId: data?.id };
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

  .post(
    "/:id/book",
    async ({ params: { id }, body, userId }) => {
      const bookingController = new BookingController({ url: "", userId });
      return bookingController.createBooking({
        vehicleId: id,
        userId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        totalPrice: body.totalPrice,
        bookingDetails: {
          pickupLocation: body.pickupLocation,
          dropoffLocation: body.dropoffLocation,
          driverDetails: body.driverDetails,
        },
      });
    },
    {
      detail: {
        summary: "Book a vehicle",
        tags: ["Vehicles - Auth User"],
      },
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        startDate: t.String(),
        endDate: t.String(),
        totalPrice: t.Number(),
        pickupLocation: t.Object({
          city: t.String(),
          country: t.String(),
          coordinates: t.Optional(
            t.Object({
              latitude: t.Number(),
              longitude: t.Number(),
            })
          ),
        }),
        dropoffLocation: t.Object({
          city: t.String(),
          country: t.String(),
          coordinates: t.Optional(
            t.Object({
              latitude: t.Number(),
              longitude: t.Number(),
            })
          ),
        }),
        driverDetails: t.Optional(
          t.Object({
            licenseNumber: t.String(),
            expiryDate: t.String(),
          })
        ),
        insuranceOption: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/bookings/history",
    async ({ userId }) => {
      const bookingController = new BookingController({ url: "", userId });
      return bookingController.getMyBookings({
        type: "vehicle",
      });
    },
    {
      detail: {
        summary: "Get vehicle booking history",
        tags: ["Vehicles - Auth User"],
      },
    }
  )

  .group("/admin", (app) =>
    app
      .post("/", async ({ body }) => vehicleController.createVehicle(body), {
        detail: {
          summary: "Create a new vehicle",
          tags: ["Vehicles - Admin"],
        },
        body: t.Object({
          vehicleType: t.String(),
          make: t.String(),
          model: t.String(),
          year: t.Optional(t.Number()),
          features: t.Array(t.String()),
          capacity: t.Number(),
          pricePerDay: t.Number(),
          city: t.String(),
          country: t.String(),
          images: t.Array(t.String()),
          policies: t.Optional(t.String()),
        }),
      })
      .put(
        "/:id",
        async ({ params: { id }, body }) =>
          vehicleController.updateVehicle(id, body),
        {
          detail: {
            summary: "Update a vehicle",
            tags: ["Vehicles - Admin"],
          },
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            vehicleType: t.Optional(t.String()),
            make: t.Optional(t.String()),
            model: t.Optional(t.String()),
            year: t.Optional(t.Number()),
            features: t.Optional(t.Array(t.String())),
            capacity: t.Optional(t.Number()),
            pricePerDay: t.Optional(t.Number()),
            city: t.Optional(t.String()),
            country: t.Optional(t.String()),
            images: t.Optional(t.Array(t.String())),
            policies: t.Optional(t.String()),
            isAvailable: t.Optional(t.Boolean()),
          }),
        }
      )
      .delete(
        "/:id",
        async ({ params: { id } }) => vehicleController.deleteVehicle(id),
        {
          detail: {
            summary: "Delete a vehicle",
            tags: ["Vehicles - Admin"],
          },
          params: t.Object({
            id: t.String(),
          }),
        }
      )
      .get("/stats", async () => vehicleController.getVehicleStats(), {
        detail: {
          summary: "Get vehicle statistics",
          tags: ["Vehicles - Admin"],
        },
      })
  );

export default vehicleRoutes;
