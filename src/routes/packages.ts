import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import PackageController from "../controllers/PackageController";
import PackageTemplateController from "../controllers/PackageTemplateController";
import { verifyJWT } from "../middlewares/auth";
import { isAdmin } from "../middlewares/roleCheck";

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
      sortBy: t.Optional(
        t.Union([
          t.Literal("price"),
          t.Literal("rating"),
          t.Literal("createdAt"),
        ])
      ),
      sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
    }),
  })
  .get(
    "/:id",
    async ({ params: { id } }) => packageController.getPackageById(id),
    {
      detail: {
        summary: "Get package by ID",
        tags: ["Packages - Public"],
      },
      params: t.Object({
        id: t.String(),
      }),
    }
  )
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
                day: t.Number({ minimum: 1 }),
                title: t.String(),
                description: t.String(),
                activities: t.Optional(t.Array(t.String())),
              })
            )
          ),
          termsAndConditions: t.Optional(t.String()),
          availability: t.Object({
            startDate: t.String({ format: "date-time" }),
            endDate: t.String({ format: "date-time" }),
          }),
        }),
      })
      .put(
        "/:id",
        async ({ params: { id }, body }) =>
          packageController.updatePackage(id, body),
        {
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
        }
      )
      .delete(
        "/:id",
        async ({ params: { id } }) => packageController.deletePackage(id),
        {
          detail: {
            summary: "Delete a package",
            tags: ["Packages - Admin"],
          },
          params: t.Object({
            id: t.String(),
          }),
        }
      )
      .post(
        "/:id/customize",
        async ({ params: { id }, body }) =>
          packageController.customizePackage(id, body),
        {
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
        }
      )
      .post(
        "/:id/share",
        async ({ params: { id }, body, user }) =>
          packageController.sharePackage(id, user._id, body.sharedWithIds),
        {
          detail: {
            summary: "Share a package with other users",
            tags: ["Packages - Auth User"],
          },
          body: t.Object({
            sharedWithIds: t.Array(t.String()),
          }),
        }
      )
      .post(
        "/:id/meals",
        async ({ params: { id }, body, user }) =>
          packageController.updateMealPlan(id, user._id, body.meals),
        {
          detail: {
            summary: "Update package meal plan",
            tags: ["Packages - Auth User"],
          },
          body: t.Object({
            meals: t.Array(
              t.Object({
                type: t.Union([
                  t.Literal("Breakfast"),
                  t.Literal("Lunch"),
                  t.Literal("Dinner"),
                ]),
                date: t.String(),
                venue: t.Optional(t.String()),
                isIncluded: t.Boolean(),
                preferences: t.Optional(t.Array(t.String())),
              })
            ),
          }),
        }
      )
      .post(
        "/:id/budget",
        async ({ params: { id }, body, user }) =>
          packageController.updateBudget(id, user._id, body.budget),
        {
          detail: {
            summary: "Update package budget",
            tags: ["Packages - Auth User"],
          },
          body: t.Object({
            budget: t.Object({
              estimatedTotal: t.Number(),
              breakdown: t.Object({
                accommodation: t.Number(),
                transportation: t.Number(),
                activities: t.Number(),
                meals: t.Number(),
                others: t.Number(),
              }),
            }),
          }),
        }
      )
      .post(
        "/:id/templates",
        async ({ params: { id }, body, user }) => {
          return packageController.saveAsTemplate(id, user._id, body);
        },
        {
          detail: {
            tags: ["Packages - Auth User"],
            summary: "Save package customization as template",
          },
          body: t.Object({
            name: t.String(),
            description: t.Optional(t.String()),
            customizations: t.Object({
              accommodations: t.Optional(
                t.Object({
                  hotelIds: t.Optional(t.Array(t.String())),
                  preferences: t.Optional(
                    t.Object({
                      roomTypes: t.Optional(t.Array(t.String())),
                      amenities: t.Optional(t.Array(t.String())),
                      boardBasis: t.Optional(t.Array(t.String())),
                      location: t.Optional(t.Array(t.String())),
                    })
                  ),
                })
              ),
              transportation: t.Optional(
                t.Object({
                  type: t.Optional(
                    t.Union([
                      t.Literal("Flight"),
                      t.Literal("Train"),
                      t.Literal("Bus"),
                      t.Literal("Private Car"),
                      t.Literal("None"),
                    ])
                  ),
                  preferences: t.Optional(
                    t.Object({
                      class: t.Optional(t.String()),
                      seatingPreference: t.Optional(t.String()),
                      specialAssistance: t.Optional(t.Array(t.String())),
                      luggageOptions: t.Optional(t.Array(t.String())),
                    })
                  ),
                })
              ),
              activities: t.Optional(
                t.Object({
                  included: t.Optional(t.Array(t.String())),
                  excluded: t.Optional(t.Array(t.String())),
                  preferences: t.Optional(
                    t.Object({
                      difficulty: t.Optional(t.Array(t.String())),
                      duration: t.Optional(t.Array(t.String())),
                      type: t.Optional(t.Array(t.String())),
                      timeOfDay: t.Optional(t.Array(t.String())),
                    })
                  ),
                })
              ),
              meals: t.Optional(
                t.Object({
                  included: t.Optional(
                    t.Object({
                      breakfast: t.Optional(t.Boolean()),
                      lunch: t.Optional(t.Boolean()),
                      dinner: t.Optional(t.Boolean()),
                    })
                  ),
                  preferences: t.Optional(
                    t.Object({
                      dietary: t.Optional(t.Array(t.String())),
                      cuisine: t.Optional(t.Array(t.String())),
                      mealTimes: t.Optional(
                        t.Object({
                          breakfast: t.Optional(t.String()),
                          lunch: t.Optional(t.String()),
                          dinner: t.Optional(t.String()),
                        })
                      ),
                    })
                  ),
                })
              ),
              itinerary: t.Optional(
                t.Object({
                  pace: t.Optional(
                    t.Union([
                      t.Literal("Relaxed"),
                      t.Literal("Moderate"),
                      t.Literal("Fast"),
                    ])
                  ),
                  flexibility: t.Optional(
                    t.Union([
                      t.Literal("Fixed"),
                      t.Literal("Flexible"),
                      t.Literal("Very Flexible"),
                    ])
                  ),
                  focusAreas: t.Optional(t.Array(t.String())),
                  customDays: t.Optional(
                    t.Array(
                      t.Object({
                        day: t.Number(),
                        title: t.String(),
                        description: t.String(),
                        activities: t.Array(t.String()),
                        meals: t.Optional(
                          t.Object({
                            breakfast: t.Optional(t.String()),
                            lunch: t.Optional(t.String()),
                            dinner: t.Optional(t.String()),
                          })
                        ),
                      })
                    )
                  ),
                })
              ),
              accessibility: t.Optional(
                t.Object({
                  wheelchairAccess: t.Optional(t.Boolean()),
                  mobilityAssistance: t.Optional(t.Boolean()),
                  dietaryRestrictions: t.Optional(t.Array(t.String())),
                  medicalRequirements: t.Optional(t.Array(t.String())),
                })
              ),
              budget: t.Optional(
                t.Object({
                  maxBudget: t.Optional(t.Number()),
                  priorityAreas: t.Optional(t.Array(t.String())),
                  flexibleAreas: t.Optional(t.Array(t.String())),
                })
              ),
            }),
            isPublic: t.Optional(t.Boolean()),
            tags: t.Optional(t.Array(t.String())),
          }),
        }
      )
      .get(
        "/templates",
        async ({ user, query }) => {
          return packageController.getTemplates(user._id, query);
        },
        {
          detail: {
            tags: ["Packages - Auth User"],
            summary: "Get user's package templates",
          },
          query: t.Object({
            search: t.Optional(t.String()),
            tags: t.Optional(t.Array(t.String())),
            page: t.Optional(t.Number()),
            limit: t.Optional(t.Number()),
          }),
        }
      )
      .post(
        "/templates/:id/create",
        async ({ params: { id }, body, user }) => {
          return packageController.createFromTemplate(
            id,
            user._id,
            body.customizations
          );
        },
        {
          detail: {
            tags: ["Packages - Auth User"],
            summary: "Create package from template",
          },
          body: t.Object({
            customizations: t.Optional(t.Any()),
          }),
        }
      )
  );

// Package Template routes
// User-facing routes
packageRoutes.get(
  "/templates/my",
  verifyJWT,
  PackageTemplateController.getAllForUser
);
packageRoutes.get(
  "/templates/public",
  PackageTemplateController.getPublicTemplates
);
packageRoutes.get(
  "/templates/:id",
  verifyJWT,
  PackageTemplateController.getById
);
packageRoutes.post("/templates", verifyJWT, PackageTemplateController.create);
packageRoutes.put(
  "/templates/:id",
  verifyJWT,
  PackageTemplateController.update
);
packageRoutes.delete(
  "/templates/:id",
  verifyJWT,
  PackageTemplateController.delete
);
packageRoutes.post(
  "/templates/:id/submit",
  verifyJWT,
  PackageTemplateController.submitForReview
);
packageRoutes.get(
  "/templates/:id/availability",
  PackageTemplateController.checkAvailability
);

// Admin-only routes
packageRoutes.get(
  "/admin/templates",
  verifyJWT,
  isAdmin,
  PackageTemplateController.getAllForAdmin
);
packageRoutes.post(
  "/templates/:id/approve",
  verifyJWT,
  isAdmin,
  PackageTemplateController.approveTemplate
);
packageRoutes.post(
  "/templates/:id/reject",
  verifyJWT,
  isAdmin,
  PackageTemplateController.rejectTemplate
);
packageRoutes.post(
  "/templates/:id/publish",
  verifyJWT,
  isAdmin,
  PackageTemplateController.publishAsPackage
);

export default packageRoutes;
