import { Elysia, t } from "elysia";
import FavoriteController from "../controllers/FavoriteController";

const favoriteController = new FavoriteController();

const favoritesRoutes = new Elysia({ prefix: "/api/v1/favorites" })
  .guard({
    detail: {
      tags: ["Favorites"],
      security: [{ BearerAuth: [] }],
      description:
        "Routes for managing user favorites. Requires authentication.",
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
    "/:itemType/:id",
    ({ params: { id, itemType }, userId }) => {
      if (!["hotel", "vehicle", "package"].includes(itemType)) {
        throw new Error("Invalid item type");
      }
      return favoriteController.toggleFavorite(
        id,
        itemType as "hotel" | "vehicle" | "package",
        userId
      );
    },
    {
      detail: {
        summary: "Toggle Favorite Status",
        description:
          "Toggle the favorite status of a hotel, vehicle, or travel package for the authenticated user",
        tags: ["Favorites"],
      },
      params: t.Object({
        itemType: t.String({
          description: "Type of item to favorite",
          enum: ["hotel", "vehicle", "package"],
        }),
        id: t.String({
          description: "ID of the item to favorite",
          example: "507f1f77bcf86cd799439011",
        }),
      }),
      responses: {
        200: {
          description: "Successfully toggled favorite status",
          content: {
            "application/json": {
              schema: t.Object({
                isFavorite: t.Boolean({
                  description: "New favorite status after toggle",
                  example: true,
                }),
              }),
            },
          },
        },
        404: {
          description: "Item not found",
          content: {
            "application/json": {
              schema: t.Object({
                message: t.String({
                  example: "hotel not found",
                }),
                errors: t.Array(
                  t.Object({
                    type: t.String({ example: "NotFoundError" }),
                    path: t.Array(t.String()),
                    message: t.String(),
                  })
                ),
              }),
            },
          },
        },
        401: {
          description: "Unauthorized - Invalid or missing token",
          content: {
            "application/json": {
              schema: t.Object({
                message: t.String({ example: "Unauthorized" }),
                errors: t.Array(
                  t.Object({
                    type: t.String({ example: "AuthError" }),
                    path: t.Array(t.String()),
                    message: t.String(),
                  })
                ),
              }),
            },
          },
        },
      },
    }
  )
  .get(
    "/",
    ({ query: { type }, userId }) =>
      favoriteController.getUserFavorites(
        userId,
        type as "hotel" | "vehicle" | "package" | undefined
      ),
    {
      detail: {
        summary: "Get User Favorites",
        description:
          "Retrieve all favorites for the authenticated user. Optionally filter by item type.",
        tags: ["Favorites"],
      },
      query: t.Object({
        type: t.Optional(
          t.String({
            description: "Filter favorites by item type",
            enum: ["hotel", "vehicle", "package"],
          })
        ),
      }),
      responses: {
        200: {
          description: "Successfully retrieved favorites",
          content: {
            "application/json": {
              schema: t.Object({
                hotels: t.Array(
                  t.Object({
                    _id: t.String(),
                    name: t.String(),
                    favoriteId: t.String(),
                    // Add other relevant hotel fields
                  })
                ),
                vehicles: t.Array(
                  t.Object({
                    _id: t.String(),
                    name: t.String(),
                    favoriteId: t.String(),
                    // Add other relevant vehicle fields
                  })
                ),
                packages: t.Array(
                  t.Object({
                    _id: t.String(),
                    name: t.String(),
                    favoriteId: t.String(),
                    // Add other relevant package fields
                  })
                ),
              }),
              examples: {
                "Mixed Results": {
                  value: {
                    hotels: [
                      {
                        _id: "507f1f77bcf86cd799439011",
                        name: "Luxury Resort",
                        favoriteId: "507f1f77bcf86cd799439099",
                      },
                    ],
                    vehicles: [
                      {
                        _id: "507f1f77bcf86cd799439022",
                        name: "SUV Premium",
                        favoriteId: "507f1f77bcf86cd799439088",
                      },
                    ],
                    packages: [
                      {
                        _id: "507f1f77bcf86cd799439033",
                        name: "Weekend Getaway",
                        favoriteId: "507f1f77bcf86cd799439077",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        401: {
          description: "Unauthorized - Invalid or missing token",
          content: {
            "application/json": {
              schema: t.Object({
                message: t.String({ example: "Unauthorized" }),
                errors: t.Array(
                  t.Object({
                    type: t.String({ example: "AuthError" }),
                    path: t.Array(t.String()),
                    message: t.String(),
                  })
                ),
              }),
            },
          },
        },
      },
    }
  );

export default favoritesRoutes;
