import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import HotelController from "../controllers/HotelController";

const hotelController = new HotelController();

/**
 * Hotel routes for admin operations
 * Base path: /api/v1/hotels/admin
 */
const hotelAdminRoutes = new Elysia({ prefix: "/api/v1/hotels/admin" })

  .guard({
    detail: {
      description: "Require admin privileges",
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

  .get(
    "/",
    async ({ query }) =>
      hotelController.getHotels({
        page: Number(query.page) || 1,
        searchTerm: query.searchTerm as string,
        limit: Number(query.limit) || 10,
        city: query.city as string,
        country: query.country as string,
        sortBy: query.sortBy as "pricePerNight" | "capacity" | "rating",
        sortOrder: query.sortOrder as "asc" | "desc",
      }),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        searchTerm: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        city: t.Optional(t.String()),
        country: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get all hotels (Admin)",
        description:
          "Retrieve a list of hotels with optional filtering and pagination for admin",
        tags: ["Hotels - Admin"],
        responses: {
          200: {
            description: "List of hotels retrieved successfully",
          },
          400: {
            description: "Invalid query parameters",
          },
          401: {
            description: "Unauthorized - Invalid or missing token",
          },
          403: {
            description: "Forbidden - Not an admin",
          },
        },
      },
    }
  )

  .get("/:id", ({ params: { id } }) => hotelController.getHotelById(id), {
    detail: {
      summary: "Get hotel by ID (Admin)",
      description: "Retrieve a specific hotel by its ID for admin",
      tags: ["Hotels - Admin"],
      responses: {
        200: {
          description: "Hotel retrieved successfully",
        },
        404: {
          description: "Hotel not found",
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

  .post("/", ({ body }) => hotelController.createHotel(body), {
    body: t.Object({
      name: t.String(),
      description: t.String(),
      location: t.Object({
        city: t.String(),
        country: t.String(),
        address: t.String(),
        geo: t.Object({
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
      summary: "Create hotel (Admin)",
      description: "Create a new hotel (Admin only)",
      tags: ["Hotels - Admin"],
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
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        location: t.Optional(
          t.Object({
            city: t.String(),
            country: t.String(),
            address: t.String(),
            geo: t.Object({
              type: t.Literal("Point"),
              coordinates: t.Array(t.Number(), { minItems: 2, maxItems: 2 }),
            }),
          })
        ),
        contactInfo: t.Optional(
          t.Object({
            phone: t.String(),
            email: t.String(),
            website: t.Optional(t.String()),
          })
        ),
        starRating: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
        amenities: t.Optional(t.Array(t.String())),
        checkInTime: t.Optional(t.String()),
        checkOutTime: t.Optional(t.String()),
        images: t.Optional(t.Array(t.String())),
        policies: t.Optional(
          t.Object({
            checkIn: t.String(),
            checkOut: t.String(),
            cancellation: t.String(),
            payment: t.String(),
            houseRules: t.Array(t.String()),
          })
        ),
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
        summary: "Update hotel (Admin)",
        description: "Update an existing hotel by ID (Admin only)",
        tags: ["Hotels - Admin"],
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
      summary: "Delete hotel (Admin)",
      description: "Delete a hotel by ID (Admin only)",
      tags: ["Hotels - Admin"],
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
        summary: "Add hotel rating (Admin)",
        description: "Add a rating to a hotel (Admin only)",
        tags: ["Hotels - Admin", "Ratings"],
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
  );

export default hotelAdminRoutes;
