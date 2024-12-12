import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import HotelController from "../controllers/HotelController";

const hotelController = new HotelController();

/**
 * Hotel routes for managing hotel-related operations
 * Base path: /api/v1/hotels
 */
const hotelRoutes = new Elysia({ prefix: "/api/v1/hotels/public" })

  .guard({
    detail: {
      description: "Require user to be logged in",
    },
  })

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

  .post(
    "/:id/reviews",
    ({ params: { id }, body, userId }) =>
      hotelController.addUserReview(id, {
        userId,
        rating: body.rating,
        comment: body.comment,
      }),
    {
      body: t.Object({
        rating: t.Number({ minimum: 1, maximum: 5 }),
        comment: t.String(),
      }),
      detail: {
        summary: "Add hotel review",
        description: "Add a user review to a hotel",
        tags: ["Hotels - Auth User", "Reviews"],
        responses: {
          200: {
            description: "Review added successfully",
          },
          400: {
            description: "Invalid review data",
          },
          404: {
            description: "Hotel not found",
          },
        },
      },
    }
  )

  // .post(
  //   "/:id/favorite",
  //   ({ params: { id }, userId }) => hotelController.toggleFavorite(id, userId),
  //   {
  //     detail: {
  //       summary: "Toggle favorite",
  //       description: "Toggle favorite status of a hotel for the current user",
  //       tags: ["Hotels - Auth User", "User Preferences"],
  //       responses: {
  //         200: {
  //           description: "Favorite status toggled successfully",
  //         },
  //         404: {
  //           description: "Hotel not found",
  //         },
  //       },
  //     },
  //   }
  // )

  .post(
    "/:id/book",
    ({ params: { id }, body, userId }) =>
      hotelController.bookRoom(id, {
        userId,
        roomId: body.roomId,
        checkIn: new Date(body.checkIn),
        checkOut: new Date(body.checkOut),
        guests: body.guests,
      }),
    {
      body: t.Object({
        roomId: t.String(),
        checkIn: t.String(),
        checkOut: t.String(),
        guests: t.Number(),
      }),
      detail: {
        summary: "Book room",
        description: "Book a room in the hotel",
        tags: ["Hotels - Auth User", "Bookings"],
        responses: {
          200: {
            description: "Room booked successfully",
          },
          400: {
            description: "Invalid booking data or room not available",
          },
          404: {
            description: "Hotel or room not found",
          },
        },
      },
    }
  )

  .group("/admin", (app) =>
    app
      .post("/", ({ body }) => hotelController.createHotel(body), {
        body: t.Object({
          name: t.String(),
          description: t.String(),
          location: t.Object({
            city: t.String(),
            country: t.String(),
            address: t.String(),
            coordinates: t.Object({
              type: t.Literal("Point"),
              coordinates: t.Array(t.Number()),
            }),
          }),
          contactInfo: t.Object({
            phone: t.String(),
            email: t.String(),
            website: t.Optional(t.String()),
          }),
          starRating: t.Number({ minimum: 1, maximum: 5 }),
          amenities: t.Array(t.String()),
          checkInTime: t.String(),
          checkOutTime: t.String(),
          rooms: t.Array(
            t.Object({
              roomNumber: t.String(),
              floor: t.Number(),
              roomType: t.String(),
              pricePerNight: t.Number(),
              capacity: t.Number(),
              features: t.Array(t.String()),
              isAvailable: t.Optional(t.Boolean()),
              maintenanceStatus: t.Optional(
                t.Union([
                  t.Literal("Available"),
                  t.Literal("Cleaning"),
                  t.Literal("Maintenance"),
                ])
              ),
              images: t.Optional(t.Array(t.String())),
            })
          ),
          images: t.Array(t.String()),
          policies: t.Object({
            checkIn: t.String(),
            checkOut: t.String(),
            cancellation: t.String(),
            payment: t.String(),
            houseRules: t.Array(t.String()),
          }),
          seasonalPrices: t.Optional(
            t.Array(
              t.Object({
                startDate: t.String(),
                endDate: t.String(),
                multiplier: t.Number({ minimum: 0 }),
              })
            )
          ),
        }),
        detail: {
          summary: "Create hotel",
          description: "Create a new hotel (Admin only)",
          tags: ["Hotels", "Admin"],
          responses: {
            201: {
              description: "Hotel created successfully",
            },
            400: {
              description: "Invalid hotel data",
            },
            401: {
              description: "Unauthorized - Invalid or missing token",
            },
            403: {
              description: "Forbidden - Not an admin",
            },
          },
        },
      })

      .put(
        "/:id",
        ({ params: { id }, body }) => hotelController.updateHotel(id, body),
        {
          // body: t.Object({
          //   name: t.Optional(t.String()),
          //   description: t.Optional(t.String()),
          //   location: t.Optional(
          //     t.Object({
          //       city: t.String(),
          //       country: t.String(),
          //       address: t.String(),
          //       coordinates: t.Object({
          //         type: t.Literal('Point'),
          //         coordinates: t.Array(t.Number())
          //       }),
          //     })
          //   ),
          //   contactInfo: t.Optional(
          //     t.Object({
          //       phone: t.String(),
          //       email: t.String(),
          //       website: t.Optional(t.String()),
          //     })
          //   ),
          //   starRating: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
          //   amenities: t.Optional(t.Array(t.String())),
          //   checkInTime: t.Optional(t.String()),
          //   checkOutTime: t.Optional(t.String()),
          //   rooms: t.Optional(
          //     t.Array(
          //       t.Object({
          //         roomType: t.String(),
          //         pricePerNight: t.Number(),
          //         capacity: t.Number(),
          //         features: t.Array(t.String()),
          //         isAvailable: t.Optional(t.Boolean()),
          //         maintenanceStatus: t.Optional(
          //           t.Union([
          //             t.Literal("Available"),
          //             t.Literal("Cleaning"),
          //             t.Literal("Maintenance"),
          //           ])
          //         ),
          //         images: t.Optional(t.Array(t.String())),
          //       })
          //     )
          //   ),
          //   images: t.Optional(t.Array(t.String())),
          //   policies: t.Optional(t.String()),
          // }),
          detail: {
            summary: "Update hotel",
            description: "Update an existing hotel by ID (Admin only)",
            tags: ["Hotels", "Admin"],
            responses: {
              200: {
                description: "Hotel updated successfully",
              },
              400: {
                description: "Invalid hotel data",
              },
              401: {
                description: "Unauthorized - Invalid or missing token",
              },
              403: {
                description: "Forbidden - Not an admin",
              },
              404: {
                description: "Hotel not found",
              },
            },
          },
        }
      )

      .delete("/:id", ({ params: { id } }) => hotelController.deleteHotel(id), {
        detail: {
          summary: "Delete hotel",
          description: "Delete a hotel by ID (Admin only)",
          tags: ["Hotels", "Admin"],
          responses: {
            200: {
              description: "Hotel deleted successfully",
            },
            401: {
              description: "Unauthorized - Invalid or missing token",
            },
            403: {
              description: "Forbidden - Not an admin",
            },
            404: {
              description: "Hotel not found",
            },
          },
        },
      })

      .post(
        "/:id/ratings",
        ({ params: { id }, body }) => hotelController.addRating(id, body),
        {
          body: t.Object({
            userId: t.String(),
            rating: t.Number({ minimum: 1, maximum: 5 }),
            comment: t.Optional(t.String()),
          }),
          detail: {
            summary: "Add hotel rating",
            description: "Add a rating to a hotel (Admin only)",
            tags: ["Hotels", "Admin", "Ratings"],
            responses: {
              200: {
                description: "Rating added successfully",
              },
              400: {
                description: "Invalid rating data",
              },
              401: {
                description: "Unauthorized - Invalid or missing token",
              },
              403: {
                description: "Forbidden - Not an admin",
              },
              404: {
                description: "Hotel not found",
              },
            },
          },
        }
      )
  );

export default hotelRoutes;
