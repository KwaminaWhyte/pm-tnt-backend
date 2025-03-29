import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import PackageController from "../controllers/PackageController";
import PackageTemplateController from "../controllers/PackageTemplateController";

const packageController = new PackageController();

const packageRoutes = new Elysia({ prefix: "/api/v1/packages" })
  // Public routes
  .get("/", async ({ query }) => packageController.getPackages(query), {
    detail: {
      summary: "Get all packages with pagination and filtering",
      tags: ["Packages - Public"],
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
      .guard({
        detail: {
          tags: ["Packages - Admin"],
          security: [{ BearerAuth: [] }],
          description:
            "Admin routes for managing packages. Requires authentication.",
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
        async ({ params: { id }, body, userId }) =>
          packageController.sharePackage(id, userId, body.sharedWithIds),
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
        async ({ params: { id }, body, userId }) =>
          packageController.updateMealPlan(id, userId, body.meals),
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
        async ({ params: { id }, body, userId }) =>
          packageController.updateBudget(id, userId, body.budget),
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
        async ({ params: { id }, body, userId }) => {
          return packageController.saveAsTemplate(id, userId, body);
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
        async ({ userId, query }) => {
          return packageController.getTemplates(userId, query);
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
        async ({ params: { id }, body, userId }) => {
          return packageController.createFromTemplate(
            id,
            userId,
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

// Package Template routes - Using Elysia's built-in auth
const templateRoutes = new Elysia()
  .guard({
    detail: {
      tags: ["Package Templates"],
      description: "Routes for package templates",
    },
  })
  // Public routes
  .get(
    "/templates/public",
    async () => {
      const response = await PackageTemplateController.getPublicTemplates();
      return response;
    },
    {
      detail: {
        summary: "Get public templates",
        tags: ["Package Templates - Public"],
      },
    }
  )
  .get(
    "/templates/:id/availability",
    async ({ params: { id }, query }) => {
      const response = await PackageTemplateController.checkAvailability(
        id,
        query
      );
      return response;
    },
    {
      detail: {
        summary: "Check template availability",
        tags: ["Package Templates - Public"],
      },
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        date: t.Optional(t.String()),
        participants: t.Optional(t.Number()),
      }),
    }
  )
  // Protected routes
  .derive(({ request }) => {
    const auth = request.headers.get("authorization");
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
      // In a real implementation, you would verify the token
      // This is a placeholder - replace with actual JWT verification
      const userId = "mock-user-id"; // replace with actual user ID from JWT
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
  .guard({
    detail: {
      security: [{ BearerAuth: [] }],
    },
  })
  .get(
    "/templates/my",
    async ({ userId }) => {
      const response = await PackageTemplateController.getAllForUser(userId);
      return response;
    },
    {
      detail: {
        summary: "Get user's templates",
        tags: ["Package Templates - Auth User"],
      },
    }
  )
  .get(
    "/templates/:id",
    async ({ params: { id }, userId }) => {
      // We're setting isAdmin to false by default for regular users
      const response = await PackageTemplateController.getById(
        id,
        userId,
        false
      );
      return response;
    },
    {
      detail: {
        summary: "Get template by ID",
        tags: ["Package Templates - Auth User"],
      },
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/templates",
    async ({ body, userId }) => {
      const response = await PackageTemplateController.create(body, userId);
      return response;
    },
    {
      detail: {
        summary: "Create template",
        tags: ["Package Templates - Auth User"],
      },
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        basePackageId: t.String(),
        customizations: t.Any(),
        isPublic: t.Optional(t.Boolean()),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/templates/:id",
    async ({ params: { id }, body, userId }) => {
      const response = await PackageTemplateController.update(
        id,
        body,
        userId,
        false
      );
      return response;
    },
    {
      detail: {
        summary: "Update template",
        tags: ["Package Templates - Auth User"],
      },
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        customizations: t.Optional(t.Any()),
        isPublic: t.Optional(t.Boolean()),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .delete(
    "/templates/:id",
    async ({ params: { id }, userId }) => {
      const response = await PackageTemplateController.delete(
        id,
        userId,
        false
      );
      return response;
    },
    {
      detail: {
        summary: "Delete template",
        tags: ["Package Templates - Auth User"],
      },
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/templates/:id/submit",
    async ({ params: { id }, userId }) => {
      const response = await PackageTemplateController.submitForReview(
        id,
        userId
      );
      return response;
    },
    {
      detail: {
        summary: "Submit template for review",
        tags: ["Package Templates - Auth User"],
      },
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Admin routes with admin check
  .derive(({ userId }) => {
    // Here you would check if the user is an admin
    // For now, we'll assume all authenticated users can access admin routes
    // In a real implementation, you'd verify the user's role
    return { isAdmin: true };
  })
  .guard({
    beforeHandle: ({ isAdmin }) => {
      if (!isAdmin) {
        throw new Error(
          JSON.stringify({
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin access required",
              },
            ],
          })
        );
      }
    },
    detail: {
      tags: ["Package Templates - Admin"],
      description: "Admin routes for package templates",
    },
  })
  .get(
    "/admin/templates",
    async () => {
      const response = await PackageTemplateController.getAllForAdmin();
      return response;
    },
    {
      detail: {
        summary: "Get all templates (admin)",
        tags: ["Package Templates - Admin"],
      },
    }
  )
  .post(
    "/templates/:id/approve",
    async ({ params: { id } }) => {
      const response = await PackageTemplateController.approveTemplate(id);
      return response;
    },
    {
      detail: {
        summary: "Approve template",
        tags: ["Package Templates - Admin"],
      },
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/templates/:id/reject",
    async ({ params: { id }, body }) => {
      const response = await PackageTemplateController.rejectTemplate(
        id,
        body.feedback
      );
      return response;
    },
    {
      detail: {
        summary: "Reject template",
        tags: ["Package Templates - Admin"],
      },
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        feedback: t.String(),
      }),
    }
  )
  .post(
    "/templates/:id/publish",
    async ({ params: { id } }) => {
      const response = await PackageTemplateController.publishAsPackage(id);
      return response;
    },
    {
      detail: {
        summary: "Publish template as package",
        tags: ["Package Templates - Admin"],
      },
      params: t.Object({
        id: t.String(),
      }),
    }
  );

// Combine routes
packageRoutes.use(templateRoutes);

export default packageRoutes;
