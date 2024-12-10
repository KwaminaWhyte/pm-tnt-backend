import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import PackageController from "../controllers/PackageController";

const packageController = new PackageController();

const packageRoutes = new Elysia({ prefix: "/api/v1/packages" })
  // Public routes
  .get("/", async ({ query }) => packageController.getPackages(query), {
    detail: {
      summary: "Get all packages with pagination and filtering",
      tags: ["Packages - Public"],
      responses: {
        200: {
          description: "List of packages with pagination",
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
      sortBy: t.Optional(t.Union([t.Literal("price"), t.Literal("rating"), t.Literal("createdAt")])),
      sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
    }),
  })
  .get("/:id", async ({ params: { id } }) => packageController.getPackageById(id), {
    detail: {
      summary: "Get package by ID",
      tags: ["Packages - Public"],
    },
    params: t.Object({
      id: t.String(),
    }),
  })
  // Protected routes
  .group("/admin", (app) =>
    app
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
      .post("/", async ({ body }) => packageController.createPackage(body), {
        detail: {
          summary: "Create a new package",
          tags: ["Packages - Admin"],
        },
        body: t.Object({
          name: t.String({ minLength: 1 }),
          price: t.Number({ minimum: 0 }),
          description: t.Optional(t.String()),
          images: t.Optional(t.Array(t.String())),
          videos: t.Optional(t.Array(t.String())),
          duration: t.Object({
            days: t.Number({ minimum: 1 }),
            nights: t.Number({ minimum: 0 }),
          }),
          accommodations: t.Array(t.String()),
          transportation: t.Union([
            t.Literal("Flight"),
            t.Literal("Train"),
            t.Literal("Bus"),
            t.Literal("Private Car"),
            t.Literal("None"),
          ]),
          activities: t.Optional(t.Array(t.String())),
          meals: t.Optional(t.Object({
            breakfast: t.Optional(t.Boolean()),
            lunch: t.Optional(t.Boolean()),
            dinner: t.Optional(t.Boolean()),
          })),
          itinerary: t.Optional(t.Array(t.Object({
            day: t.Number({ minimum: 1 }),
            title: t.String(),
            description: t.String(),
            activities: t.Optional(t.Array(t.String())),
          }))),
          termsAndConditions: t.Optional(t.String()),
          availability: t.Object({
            startDate: t.String({ format: 'date-time' }),
            endDate: t.String({ format: 'date-time' }),
          }),
        }),
      })
      .put("/:id", async ({ params: { id }, body }) => packageController.updatePackage(id, body), {
        detail: {
          summary: "Update a package",
          tags: ["Packages - Admin"],
        },
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          name: t.Optional(t.String()),
          price: t.Optional(t.Number()),
          description: t.Optional(t.String()),
          images: t.Optional(t.Array(t.String())),
          videos: t.Optional(t.Array(t.String())),
          duration: t.Optional(
            t.Object({
              days: t.Number(),
              nights: t.Number(),
            })
          ),
          accommodations: t.Optional(t.Array(t.String())),
          transportation: t.Optional(
            t.Union([
              t.Literal("Flight"),
              t.Literal("Train"),
              t.Literal("Bus"),
              t.Literal("Private Car"),
              t.Literal("None"),
            ])
          ),
          activities: t.Optional(t.Array(t.String())),
          meals: t.Optional(
            t.Object({
              breakfast: t.Optional(t.Boolean()),
              lunch: t.Optional(t.Boolean()),
              dinner: t.Optional(t.Boolean()),
            })
          ),
          itinerary: t.Optional(
            t.Array(
              t.Object({
                day: t.Number(),
                title: t.String(),
                description: t.String(),
                activities: t.Optional(t.Array(t.String())),
              })
            )
          ),
          termsAndConditions: t.Optional(t.String()),
          availability: t.Optional(
            t.Object({
              startDate: t.String(),
              endDate: t.String(),
            })
          ),
        }),
      })
      .delete("/:id", async ({ params: { id } }) => packageController.deletePackage(id), {
        detail: {
          summary: "Delete a package",
          tags: ["Packages - Admin"],
        },
        params: t.Object({
          id: t.String(),
        }),
      })
      .post("/:id/customize", async ({ params: { id }, body }) => packageController.customizePackage(id, body), {
        detail: {
          summary: "Customize an existing package",
          tags: ["Packages - Auth User"],
        },
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          accommodations: t.Optional(t.Array(t.String())),
          transportation: t.Optional(
            t.Union([
              t.Literal("Flight"),
              t.Literal("Train"),
              t.Literal("Bus"),
              t.Literal("Private Car"),
              t.Literal("None"),
            ])
          ),
          activities: t.Optional(t.Array(t.String())),
          meals: t.Optional(
            t.Object({
              breakfast: t.Optional(t.Boolean()),
              lunch: t.Optional(t.Boolean()),
              dinner: t.Optional(t.Boolean()),
            })
          ),
          itinerary: t.Optional(
            t.Array(
              t.Object({
                day: t.Number(),
                title: t.String(),
                description: t.String(),
                activities: t.Optional(t.Array(t.String())),
              })
            )
          ),
        }),
      })
  );

export default packageRoutes;
