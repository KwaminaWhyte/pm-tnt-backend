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
      const bookingController = new BookingController();
      return bookingController.createBooking({
        userId,
        vehicleBooking: {
          vehicleId: id,
          pickupDate: body.startDate,
          returnDate: body.endDate,
          numberOfDays: Math.ceil(
            (new Date(body.endDate).getTime() -
              new Date(body.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          pickupLocation: {
            address: body.pickupLocation.address || "Not provided",
            city: body.pickupLocation.city,
            country: body.pickupLocation.country,
            coordinates: body.pickupLocation.coordinates,
          },
          dropoffLocation: {
            address: body.dropoffLocation.address || "Not provided",
            city: body.dropoffLocation.city,
            country: body.dropoffLocation.country,
            coordinates: body.dropoffLocation.coordinates,
          },
          driverDetails: body.driverDetails,
        },
        pricing: {
          totalPrice: body.totalPrice,
          basePrice: body.totalPrice * 0.9,
          taxes: body.totalPrice * 0.1,
        },
        startDate: body.startDate,
        endDate: body.endDate,
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
          address: t.Optional(t.String()),
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
          address: t.Optional(t.String()),
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
  .get("/", async ({ query }) => vehicleController.getVehicles(query), {
    detail: {
      summary: "Get all vehicles with pagination and filtering",
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
                  itemsPerPage: t.Number(),
                }),
              }),
            },
          },
        },
      },
    },
    query: t.Object({
      page: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
      searchTerm: t.Optional(t.String()),
      isAvailable: t.Optional(t.Boolean()),
      priceRange: t.Optional(
        t.Object({
          min: t.Number(),
          max: t.Number(),
        })
      ),
      vehicleType: t.Optional(t.String()),
      city: t.Optional(t.String()),
      country: t.Optional(t.String()),
      capacity: t.Optional(t.Number()),
      sortBy: t.Optional(
        t.Union([
          t.Literal("pricePerDay"),
          t.Literal("capacity"),
          t.Literal("rating"),
        ])
      ),
      sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
    }),
  })

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
