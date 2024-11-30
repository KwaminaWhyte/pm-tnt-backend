import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import HotelController from "../controllers/HotelController";
import { isAdmin } from "../middleware/auth";

const hotelController = new HotelController();

/**
 * Hotel routes for managing hotel-related operations
 * Base path: /api/v1/hotels
 */
const hotelRoutes = new Elysia({ prefix: "/api/v1/hotels" })
  .use(jwtConfig)
  .derive(async ({ headers, jwt_auth }) => {
    const auth = headers["authorization"];
    const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      throw new Error(
        JSON.stringify({
          status: "error",
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
      const userId = await jwt_auth.verify(token);
      return { userId };
    } catch (error) {
      throw new Error(
        JSON.stringify({
          status: "error",
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
  /**
   * Get all hotels with filtering and pagination
   * @route GET /api/v1/hotels
   * @param {number} page - Page number for pagination (default: 1)
   * @param {string} searchTerm - Search term for filtering hotels by name, city, or country
   * @param {number} limit - Number of hotels per page (default: 10)
   * @param {boolean} isAvailable - Filter by room availability
   * @param {number} minPrice - Minimum price for filtering
   * @param {number} maxPrice - Maximum price for filtering
   * @param {string} city - Filter by city
   * @param {string} country - Filter by country
   * @param {string} sortBy - Sort by field (pricePerNight, capacity, rating)
   * @param {string} sortOrder - Sort order (asc, desc)
   * @param {string} roomType - Filter by room type
   * @param {number} capacity - Filter by minimum room capacity
   * @returns {Promise<{ hotels: Hotel[], totalPages: number, currentPage: number, totalCount: number }>}
   */
  .get(
    "/",
    ({ query }) =>
      hotelController.getHotels({
        page: Number(query.page) || 1,
        searchTerm: query.searchTerm as string,
        limit: Number(query.limit) || 10,
        isAvailable: query.isAvailable === "true",
        priceRange:
          query.minPrice && query.maxPrice
            ? {
                min: Number(query.minPrice),
                max: Number(query.maxPrice),
              }
            : undefined,
        city: query.city as string,
        country: query.country as string,
        sortBy: query.sortBy as "pricePerNight" | "capacity" | "rating",
        sortOrder: query.sortOrder as "asc" | "desc",
        roomType: query.roomType as string,
        capacity: query.capacity ? Number(query.capacity) : undefined,
      }),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        searchTerm: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        isAvailable: t.Optional(t.String()),
        minPrice: t.Optional(t.String()),
        maxPrice: t.Optional(t.String()),
        city: t.Optional(t.String()),
        country: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
        roomType: t.Optional(t.String()),
        capacity: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get all hotels",
        description: "Retrieve a list of hotels with optional filtering and pagination",
        tags: ["Hotels"],
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
        },
      },
    }
  )
  /**
   * Get hotel by ID
   * @route GET /api/v1/hotels/:id
   * @param {string} id - Hotel ID
   * @returns {Promise<Hotel>}
   */
  .get("/:id", ({ params: { id } }) => hotelController.getHotelById(id), {
    detail: {
      summary: "Get hotel by ID",
      description: "Retrieve a specific hotel by its ID",
      tags: ["Hotels"],
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
      },
    }
  })
  /**
   * Get room availability for a hotel
   * @route GET /api/v1/hotels/:id/availability
   * @param {string} id - Hotel ID
   * @param {string} checkIn - Check-in date (YYYY-MM-DD)
   * @param {string} checkOut - Check-out date (YYYY-MM-DD)
   * @param {number} guests - Number of guests
   * @returns {Promise<{ availableRooms: Room[], totalRooms: number }>}
   */
  .get("/:id/availability", ({ params: { id }, query }) => 
    hotelController.getRoomAvailability(id, {
      checkIn: new Date(query.checkIn as string),
      checkOut: new Date(query.checkOut as string),
      guests: Number(query.guests)
    }), {
      query: t.Object({
        checkIn: t.String(),
        checkOut: t.String(),
        guests: t.String()
      }),
      detail: {
        summary: "Get room availability",
        description: "Check room availability for specific dates and number of guests",
        tags: ["Hotels", "Rooms"],
        responses: {
          200: {
            description: "Room availability retrieved successfully"
          },
          400: {
            description: "Invalid query parameters"
          },
          404: {
            description: "Hotel not found"
          }
        }
      }
    }
  )
  /**
   * Get nearby hotels
   * @route GET /api/v1/hotels/nearby
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {number} radius - Search radius in kilometers (optional)
   * @param {number} limit - Maximum number of results (optional)
   * @returns {Promise<Hotel[]>}
   */
  .get("/nearby", ({ query }) => 
    hotelController.getNearbyHotels({
      latitude: Number(query.latitude),
      longitude: Number(query.longitude),
      radius: query.radius ? Number(query.radius) : undefined,
      limit: query.limit ? Number(query.limit) : undefined
    }), {
      query: t.Object({
        latitude: t.String(),
        longitude: t.String(),
        radius: t.Optional(t.String()),
        limit: t.Optional(t.String())
      }),
      detail: {
        summary: "Get nearby hotels",
        description: "Find hotels within a specified radius of given coordinates",
        tags: ["Hotels", "Search"],
        responses: {
          200: {
            description: "Nearby hotels retrieved successfully"
          },
          400: {
            description: "Invalid coordinates"
          }
        }
      }
    }
  )
  /**
   * Add a review to a hotel
   * @route POST /api/v1/hotels/:id/reviews
   * @param {string} id - Hotel ID
   * @param {Object} body - Review data
   * @returns {Promise<Hotel>}
   */
  .post("/:id/reviews", ({ params: { id }, body, userId }) => 
    hotelController.addUserReview(id, {
      userId,
      rating: body.rating,
      comment: body.comment
    }), {
      body: t.Object({
        rating: t.Number({ minimum: 1, maximum: 5 }),
        comment: t.String()
      }),
      detail: {
        summary: "Add hotel review",
        description: "Add a user review to a hotel",
        tags: ["Hotels", "Reviews"],
        responses: {
          200: {
            description: "Review added successfully"
          },
          400: {
            description: "Invalid review data"
          },
          404: {
            description: "Hotel not found"
          }
        }
      }
    }
  )
  /**
   * Toggle hotel favorite status
   * @route POST /api/v1/hotels/:id/favorite
   * @param {string} id - Hotel ID
   * @returns {Promise<{ isFavorite: boolean, hotel: Hotel }>}
   */
  .post("/:id/favorite", ({ params: { id }, userId }) => 
    hotelController.toggleFavorite(id, userId), {
      detail: {
        summary: "Toggle favorite",
        description: "Toggle favorite status of a hotel for the current user",
        tags: ["Hotels", "User Preferences"],
        responses: {
          200: {
            description: "Favorite status toggled successfully"
          },
          404: {
            description: "Hotel not found"
          }
        }
      }
    }
  )
  /**
   * Book a room in a hotel
   * @route POST /api/v1/hotels/:id/book
   * @param {string} id - Hotel ID
   * @param {Object} body - Booking data
   * @returns {Promise<{ booking: Booking, room: Room }>}
   */
  .post("/:id/book", ({ params: { id }, body, userId }) => 
    hotelController.bookRoom(id, {
      userId,
      roomId: body.roomId,
      checkIn: new Date(body.checkIn),
      checkOut: new Date(body.checkOut),
      guests: body.guests
    }), {
      body: t.Object({
        roomId: t.String(),
        checkIn: t.String(),
        checkOut: t.String(),
        guests: t.Number()
      }),
      detail: {
        summary: "Book room",
        description: "Book a room in the hotel",
        tags: ["Hotels", "Bookings"],
        responses: {
          200: {
            description: "Room booked successfully"
          },
          400: {
            description: "Invalid booking data or room not available"
          },
          404: {
            description: "Hotel or room not found"
          }
        }
      }
    }
  )
  .group("/admin", (app) =>
    app
      // .guard({
      //   beforeHandle: [isAdmin],
      // })
      /**
       * Create a new hotel
       * @route POST /api/v1/hotels/admin
       * @param {Object} body - Hotel data
       * @returns {Promise<Hotel>}
       */
      .post("/", ({ body }) => hotelController.createHotel(body), {
        body: t.Object({
          name: t.String(),
          description: t.String(),
          location: t.Object({
            city: t.String(),
            country: t.String(),
            address: t.String(),
            coordinates: t.Object({
              latitude: t.Number(),
              longitude: t.Number(),
            }),
          }),
          amenities: t.Array(t.String()),
          rooms: t.Array(
            t.Object({
              roomType: t.String(),
              pricePerNight: t.Number(),
              capacity: t.Number(),
              features: t.Array(t.String()),
              isAvailable: t.Optional(t.Boolean()),
            })
          ),
          images: t.Array(t.String()),
          policies: t.Optional(t.String()),
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
      /**
       * Update hotel by ID
       * @route PUT /api/v1/hotels/admin/:id
       * @param {string} id - Hotel ID
       * @param {Object} body - Updated hotel data
       * @returns {Promise<Hotel>}
       */
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
                coordinates: t.Object({
                  latitude: t.Number(),
                  longitude: t.Number(),
                }),
              })
            ),
            amenities: t.Optional(t.Array(t.String())),
            rooms: t.Optional(
              t.Array(
                t.Object({
                  roomType: t.String(),
                  pricePerNight: t.Number(),
                  capacity: t.Number(),
                  features: t.Array(t.String()),
                  isAvailable: t.Optional(t.Boolean()),
                })
              )
            ),
            images: t.Optional(t.Array(t.String())),
            policies: t.Optional(t.String()),
          }),
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
      /**
       * Delete hotel by ID
       * @route DELETE /api/v1/hotels/admin/:id
       * @param {string} id - Hotel ID
       * @returns {Promise<Hotel>}
       */
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
      /**
       * Add rating to hotel
       * @route POST /api/v1/hotels/admin/:id/ratings
       * @param {string} id - Hotel ID
       * @param {Object} body - Rating data
       * @returns {Promise<Hotel>}
       */
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
