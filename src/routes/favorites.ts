import { Elysia, t } from "elysia";
import FavoriteController from "~/controllers/FavoriteController";

const favoriteController = new FavoriteController();

// Define the JWT auth interface
interface JWTAuth {
  verify: (token: string) => Promise<any>;
}

// Define the custom context type
type CustomContext = {
  headers: Record<string, string | undefined>;
  jwt_auth: JWTAuth;
};

const favoritesRoutes = new Elysia({ prefix: "/api/v1/favorites" })
  .guard({
    detail: {
      tags: ["Favorites"],
      security: [{ BearerAuth: [] }],
      description:
        "Routes for managing user favorites. Requires authentication.",
    },
  })
  .derive(async (context) => {
    const { headers, jwt_auth } = context as unknown as CustomContext;
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
      console.error("JWT verification error:", error);
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
      if (!["hotel", "vehicle", "package", "destination"].includes(itemType)) {
        throw new Error("Invalid item type");
      }

      return favoriteController.toggleFavorite(
        id,
        itemType as "hotel" | "vehicle" | "package" | "destination",
        userId
      );
    },
    {
      detail: {
        summary: "Toggle Favorite Status",
        description:
          "Toggle the favorite status of a hotel, vehicle, travel package, or destination for the authenticated user",
        tags: ["Favorites"],
      },
      params: t.Object({
        itemType: t.String({
          description: "Type of item to favorite",
          enum: ["hotel", "vehicle", "package", "destination"],
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
        type as "hotel" | "vehicle" | "package" | "destination" | undefined
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
            enum: ["hotel", "vehicle", "package", "destination"],
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
        itemType as "hotel" | "vehicle" | "package" | "destination"
      );
    },
    {
      params: t.Object({
        itemType: t.String({
          enum: ["hotel", "vehicle", "package", "destination"],
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
