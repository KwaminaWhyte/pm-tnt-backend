import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import BookingController from "../controllers/BookingController";

const bookingRoutes = new Elysia({ prefix: "/api/v1/bookings" })
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
  .get(
    "/",
    async ({ request, query, userId }) => {
      console.log(userId);
      const bookingController = new BookingController();
      return bookingController.getBookings({ ...query, userId });
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Get all bookings",
        description:
          "Retrieve a paginated list of bookings with optional filters",
      },
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        status: t.Optional(t.String()),
        paymentStatus: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
    }
  )
  // Admin route to get all bookings (for admin dashboard)
  .get(
    "/admin",
    async ({ request, query }) => {
      const bookingController = new BookingController();
      return bookingController.getAdminBookings(query);
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Get all bookings (Admin Only)",
        description:
          "Retrieve a paginated list of all bookings with optional filters (Admin access required)",
      },
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        type: t.Optional(t.String()),
        status: t.Optional(t.String()),
        paymentStatus: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        searchTerm: t.Optional(t.String()),
      }),
    }
  )

  .get(
    "/:id",
    async ({ request, params: { id }, userId }) => {
      const bookingController = new BookingController();
      return bookingController.getBookingById(id, userId);
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Get booking by ID",
        description: "Retrieve detailed information about a specific booking",
      },
    }
  )
  .post(
    "/",
    async ({ request, body, userId }) => {
      const bookingController = new BookingController();
      return bookingController.createBooking({ ...body, userId });
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Create a new booking",
        description: "Create a new booking for hotel, vehicle, or package",
      },
      body: t.Object({
        hotelBooking: t.Optional(
          t.Object({
            hotelId: t.String(),
            roomIds: t.Array(t.String()),
            checkIn: t.String(),
            checkOut: t.String(),
            numberOfGuests: t.Number(),
            numberOfNights: t.Number(),
            specialRequests: t.Optional(t.String()),
          })
        ),
        vehicleBooking: t.Optional(
          t.Object({
            vehicleId: t.String(),
            pickupDate: t.String(),
            returnDate: t.String(),
            pickupLocation: t.Object({
              address: t.String(),
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
              address: t.String(),
              city: t.String(),
              country: t.String(),
              coordinates: t.Optional(
                t.Object({
                  latitude: t.Number(),
                  longitude: t.Number(),
                })
              ),
            }),
            numberOfDays: t.Number(),
            driverDetails: t.Optional(
              t.Object({
                name: t.String(),
                licenseNumber: t.String(),
                contactNumber: t.String(),
              })
            ),
          })
        ),
        packageBooking: t.Optional(
          t.Object({
            packageId: t.String(),
            startDate: t.String(),
            participants: t.Array(
              t.Object({
                type: t.Union([
                  t.Literal("adult"),
                  t.Literal("child"),
                  t.Literal("infant"),
                ]),
                count: t.Number(),
              })
            ),
            customizations: t.Optional(
              t.Array(
                t.Object({
                  type: t.Union([
                    t.Literal("hotel"),
                    t.Literal("activity"),
                    t.Literal("transportation"),
                  ]),
                  itemId: t.String(),
                  details: t.Optional(t.String()),
                })
              )
            ),
          })
        ),
      }),
    }
  )
  .put(
    "/:id",
    async ({ request, params: { id }, body, userId }) => {
      const bookingController = new BookingController();
      return bookingController.updateBooking(id, body, userId);
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Update a booking",
        description: "Update an existing booking's details",
      },
      body: t.Object({
        status: t.Optional(t.String()),
        hotelBooking: t.Optional(
          t.Object({
            checkIn: t.Optional(t.String()),
            checkOut: t.Optional(t.String()),
            numberOfGuests: t.Optional(t.Number()),
            specialRequests: t.Optional(t.String()),
          })
        ),
        vehicleBooking: t.Optional(
          t.Object({
            pickupDate: t.Optional(t.String()),
            returnDate: t.Optional(t.String()),
            pickupLocation: t.Optional(
              t.Object({
                address: t.String(),
                city: t.String(),
                country: t.String(),
              })
            ),
            dropoffLocation: t.Optional(
              t.Object({
                address: t.String(),
                city: t.String(),
                country: t.String(),
              })
            ),
          })
        ),
        packageBooking: t.Optional(
          t.Object({
            startDate: t.Optional(t.String()),
            participants: t.Optional(
              t.Array(
                t.Object({
                  type: t.Union([
                    t.Literal("adult"),
                    t.Literal("child"),
                    t.Literal("infant"),
                  ]),
                  count: t.Number(),
                })
              )
            ),
          })
        ),
      }),
    }
  )
  .post(
    "/:id/cancel",
    async ({ request, params: { id }, userId }) => {
      const bookingController = new BookingController();
      return bookingController.cancelBooking(id, userId);
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Cancel a booking",
        description:
          "Cancel an existing booking and process refund if applicable",
      },
    }
  )
  .post(
    "/:id/itinerary/progress",
    async ({ request, params: { id }, body, userId }) => {
      const bookingController = new BookingController();
      return bookingController.updateItineraryProgress(
        id,
        body.activityId,
        body.status,
        userId
      );
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Update itinerary progress",
        description:
          "Update the progress of activities in a booking's itinerary",
      },
      body: t.Object({
        activityId: t.String(),
        status: t.Union([t.Literal("completed"), t.Literal("upcoming")]),
      }),
    }
  )
  .post(
    "/packages",
    async ({ request, body, userId }) => {
      const bookingController = new BookingController();

      // Create package booking data in the expected format
      const bookingData = {
        userId: String(userId),
        bookingType: "package", // Required field
        startDate: body.startDate,
        endDate: new Date(
          new Date(body.startDate).getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // Add 7 days by default
        bookingDetails: {
          specialRequests: body.specialRequests,
        },
        packageBooking: {
          packageId: body.packageId,
          startDate: body.startDate,
          participants: [
            {
              type: "adult",
              count: body.participants,
            },
          ],
        },
        // Add required pricing fields
        pricing: {
          basePrice: 0, // Will be calculated by the controller
          taxes: 0, // Will be calculated by the controller
          totalPrice: 0, // Will be calculated by the controller
        },
      };

      try {
        // Calculate pricing before creating the booking
        const Package = require("../models/Package").default;
        const pkg = await Package.findById(body.packageId);

        if (pkg) {
          // Calculate base price based on participants
          const basePrice = pkg.basePrice * body.participants;
          // Calculate taxes (assuming 10% tax rate)
          const taxes = basePrice * 0.1;
          // Set total price
          const totalPrice = basePrice + taxes;

          // Update the booking data with calculated prices
          bookingData.pricing = {
            basePrice,
            taxes,
            totalPrice,
          };
        }

        const result = await bookingController.createBooking(bookingData);

        // If booking was successful, create a notification
        if (result.success && result.data) {
          try {
            const NotificationController =
              require("../controllers/NotificationController").default;
            const notificationController = new NotificationController();

            // Get package name or use a default
            let packageName = "Package";
            if (
              result.data.packageBooking &&
              result.data.packageBooking.packageId
            ) {
              const packageId = result.data.packageBooking.packageId;
              packageName = packageId.name || "Package";
            }

            // Create notification
            await notificationController.createBookingConfirmation(
              String(userId),
              {
                name: packageName,
                type: "package",
                reference: result.data.bookingReference || "N/A",
              }
            );
          } catch (error) {
            console.error("Error creating notification:", error);
            // Continue even if notification creation fails
          }
        }

        return result;
      } catch (error: any) {
        console.error("Error booking package:", error);
        return {
          success: false,
          message: error?.message || "Failed to book package",
          error,
        };
      }
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Create a package booking",
        description: "Create a new booking for a travel package",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        packageId: t.String(),
        startDate: t.String(),
        participants: t.Number(),
        specialRequests: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/my-bookings",
    async ({ request, query, userId }) => {
      const bookingController = new BookingController();
      return bookingController.getUserBookings(userId, query);
    },
    {
      detail: {
        tags: ["Bookings"],
        summary: "Get logged-in user's bookings",
        description:
          "Retrieve a paginated list of bookings for the authenticated user",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        status: t.Optional(t.String()),
        paymentStatus: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        bookingType: t.String({
          description: "Type of item to bookings",
          enum: ["hotel", "vehicle", "package", "all"],
        }),
        // bookingType: t.Optional(
        //   t.Union([
        //     t.Literal("hotel"),
        //     t.Literal("vehicle"),
        //     t.Literal("package"),
        //   ])
        // ),
      }),
    }
  );

export default bookingRoutes;
