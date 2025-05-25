import { Elysia, t } from "elysia";
import FavoriteController from "~/controllers/FavoriteController";

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

      if (!data) {
        throw new Error("Invalid token");
      }
      const payload = data as Record<string, any>;

      const userId = payload.userId;

      if (!userId) {
        throw new Error("User ID not found in token");
      }

      return { userId };
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
    }
  )
  .get(
    "/check/:itemType/:id",
    async ({ params: { itemType, id }, userId }) => {
      return favoriteController.isFavorited(
        userId,
        id,
        itemType as "hotel" | "vehicle" | "package"
      );
    },
    {
      params: t.Object({
        itemType: t.String({
          enum: ["hotel", "vehicle", "package"],
        }),
        id: t.String(),
      }),
      detail: {
        summary: "Check Favorite Status",
        description: "Check if an item is favorited by the authenticated user",
        tags: ["Favorites"],
      },
    }
  );

export default favoritesRoutes;
