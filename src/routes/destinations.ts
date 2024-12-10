import { Elysia, t } from "elysia";
import DestinationController from "../controllers/DestinationController";
import { jwtConfig } from "../utils/jwt.config";

const destinationController = new DestinationController();

const destinationRoutes = new Elysia({ prefix: "/api/v1/destinations" })
  // Public routes
  .get("/", async ({ query }) => destinationController.getDestinations(query), {
    detail: {
      summary: "Get all destinations with pagination and filtering",
      tags: ["Destinations - Public"],
      responses: {
        200: {
          description: "List of destinations with pagination",
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
        400: {
          description: "Invalid query parameters",
        },
        500: {
          description: "Server error",
        },
      },
    },
    query: t.Object({
      page: t.Optional(t.Number({ minimum: 1 })),
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      searchTerm: t.Optional(t.String()),
      country: t.Optional(t.String()),
      city: t.Optional(t.String()),
      climate: t.Optional(t.Union([
        t.Literal("Tropical"),
        t.Literal("Dry"),
        t.Literal("Temperate"),
        t.Literal("Continental"),
        t.Literal("Polar"),
      ])),
      minPrice: t.Optional(t.Number({ minimum: 0 })),
      maxPrice: t.Optional(t.Number({ minimum: 0 })),
      sortBy: t.Optional(t.Union([
        t.Literal("price"),
        t.Literal("rating"),
        t.Literal("createdAt"),
        t.Literal("name"),
      ])),
      sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      nearLocation: t.Optional(t.Object({
        longitude: t.Number(),
        latitude: t.Number(),
        maxDistance: t.Number({ minimum: 0 }), // in kilometers
      })),
    }),
  })

  .get("/:id", async ({ params: { id } }) => destinationController.getDestination(id), {
    detail: {
      summary: "Get destination by ID",
      tags: ["Destinations - Public"],
    },
    params: t.Object({
      id: t.String(),
    }),
  })

  // Protected admin routes
  .group("/admin", (app) =>
    app
      .derive(async ({ headers, jwt_auth }) => {
        const auth = headers["authorization"];
        if (!auth) {
          throw new Error("Missing authorization header");
        }

        try {
          const token = auth.split(" ")[1];
          const payload = await jwt_auth.verify(token);
          if (!payload || payload.role !== "admin") {
            throw new Error("Unauthorized");
          }
        } catch (e) {
          throw new Error("Invalid token");
        }
      })
      .post("/", async ({ body }) => destinationController.createDestination(body), {
        detail: {
          summary: "Create a new destination",
          tags: ["Destinations - Admin"],
        },
        body: t.Object({
          name: t.String({ minLength: 1 }),
          country: t.String({ minLength: 1 }),
          city: t.String({ minLength: 1 }),
          description: t.String({ minLength: 1 }),
          highlights: t.Array(t.String()),
          price: t.Number({ minimum: 0 }),
          discount: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
          images: t.Array(t.String()),
          location: t.Object({
            coordinates: t.Array(t.Number(), { minItems: 2, maxItems: 2 }),
          }),
          bestTimeToVisit: t.Object({
            startMonth: t.Number({ minimum: 1, maximum: 12 }),
            endMonth: t.Number({ minimum: 1, maximum: 12 }),
          }),
          climate: t.Union([
            t.Literal("Tropical"),
            t.Literal("Dry"),
            t.Literal("Temperate"),
            t.Literal("Continental"),
            t.Literal("Polar"),
          ]),
          popularActivities: t.Optional(t.Array(t.String())),
          localCuisine: t.Optional(t.Array(t.String())),
          culturalEvents: t.Optional(t.Array(t.Object({
            name: t.String(),
            month: t.Number({ minimum: 1, maximum: 12 }),
            description: t.Optional(t.String()),
          }))),
        }),
      })
      .put("/:id", async ({ params: { id }, body }) => destinationController.updateDestination(id, body), {
        detail: {
          summary: "Update a destination",
          tags: ["Destinations - Admin"],
        },
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          name: t.Optional(t.String({ minLength: 1 })),
          country: t.Optional(t.String({ minLength: 1 })),
          city: t.Optional(t.String({ minLength: 1 })),
          description: t.Optional(t.String({ minLength: 1 })),
          highlights: t.Optional(t.Array(t.String())),
          price: t.Optional(t.Number({ minimum: 0 })),
          discount: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
          images: t.Optional(t.Array(t.String())),
          location: t.Optional(t.Object({
            coordinates: t.Array(t.Number(), { minItems: 2, maxItems: 2 }),
          })),
          bestTimeToVisit: t.Optional(t.Object({
            startMonth: t.Number({ minimum: 1, maximum: 12 }),
            endMonth: t.Number({ minimum: 1, maximum: 12 }),
          })),
          climate: t.Optional(t.Union([
            t.Literal("Tropical"),
            t.Literal("Dry"),
            t.Literal("Temperate"),
            t.Literal("Continental"),
            t.Literal("Polar"),
          ])),
          popularActivities: t.Optional(t.Array(t.String())),
          localCuisine: t.Optional(t.Array(t.String())),
          culturalEvents: t.Optional(t.Array(t.Object({
            name: t.String(),
            month: t.Number({ minimum: 1, maximum: 12 }),
            description: t.Optional(t.String()),
          }))),
          isActive: t.Optional(t.Boolean()),
        }),
      })
      .delete("/:id", async ({ params: { id } }) => destinationController.deleteDestination(id), {
        detail: {
          summary: "Delete a destination",
          tags: ["Destinations - Admin"],
        },
        params: t.Object({
          id: t.String(),
        }),
      })
  );

export default destinationRoutes;
