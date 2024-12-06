import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import UserController from "../controllers/UserController";

const userController = new UserController();

const userRoutes = new Elysia({ prefix: "/api/v1/users" })
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
  .get("/me", async ({ userId }) => userController.getUser(userId), {
    detail: {
      tags: ["Users"],
      summary: "Get current user profile",
      description:
        "Retrieve the profile information of the currently authenticated user",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "User profile retrieved successfully",
          content: {
            "application/json": {
              schema: t.Object({
                id: t.String(),
                email: t.String(),
                firstName: t.String(),
                lastName: t.Optional(t.String()),
                phone: t.Optional(t.String()),
                createdAt: t.String(),
                updatedAt: t.String(),
              }),
            },
          },
        },
        401: {
          description: "Unauthorized - Invalid or missing token",
          content: {
            "application/json": {
              schema: t.Object({
                status: t.Literal("error"),
                message: t.String(),
                errors: t.Array(
                  t.Object({
                    type: t.String(),
                    path: t.Array(t.String()),
                    message: t.String(),
                  })
                ),
              }),
            },
          },
        },
      },
    },
  })
  .put(
    "/me",
    async ({ userId, body }) => userController.updateUserProfile(userId, body),
    {
      body: t.Object({
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
        phone: t.Optional(t.String({ pattern: "^\\+?[0-9]\\d{1,14}$" })),
      }),
      detail: {
        tags: ["Users"],
        summary: "Update current user profile",
        description:
          "Update the profile information of the currently authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: t.Object({
                  id: t.String(),
                  email: t.String(),
                  firstName: t.String(),
                  lastName: t.Optional(t.String()),
                  phone: t.Optional(t.String()),
                  updatedAt: t.String(),
                }),
              },
            },
          },
          400: {
            description: "Invalid input data",
            content: {
              "application/json": {
                schema: t.Object({
                  status: t.Literal("error"),
                  message: t.String(),
                  errors: t.Array(
                    t.Object({
                      type: t.String(),
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
                  status: t.Literal("error"),
                  message: t.String(),
                  errors: t.Array(
                    t.Object({
                      type: t.String(),
                      path: t.Array(t.String()),
                      message: t.String(),
                    })
                  ),
                }),
              },
            },
          },
        },
      },
    }
  )
  .get(
    "/",
    async ({ query }) =>
      await userController.getUsers({
        page: query?.page ? parseInt(query.page as string) : 1,
        limit: query?.limit ? parseInt(query.limit as string) : 10,
        searchTerm: query?.searchTerm as string,
        sortBy: query?.sortBy as "createdAt" | "email",
        sortOrder: query?.sortOrder as "asc" | "desc",
      }),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        searchTerm: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Users"],
        summary: "List users",
        description: "Retrieve a list of users with optional pagination and filtering",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Users retrieved successfully",
            content: {
              "application/json": {
                schema: t.Object({
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
          401: {
            description: "Unauthorized - Invalid or missing token",
            content: {
              "application/json": {
                schema: t.Object({
                  status: t.Literal("error"),
                  message: t.String(),
                  errors: t.Array(
                    t.Object({
                      type: t.String(),
                      path: t.Array(t.String()),
                      message: t.String(),
                    })
                  ),
                }),
              },
            },
          },
        },
      },
    }
  )
  .put(
    "/me/password",
    async ({ userId, body: { currentPassword, newPassword } }) =>
      userController.changePassword({ userId, currentPassword, newPassword }),
    {
      body: t.Object({
        currentPassword: t.String({ minLength: 6 }),
        newPassword: t.String({ minLength: 6 }),
      }),
      detail: {
        tags: ["Users"],
        summary: "Change user password",
        description: "Change the password for the currently authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: t.Object({
                  message: t.String(),
                }),
              },
            },
          },
          400: {
            description: "Invalid input data or incorrect current password",
            content: {
              "application/json": {
                schema: t.Object({
                  status: t.Literal("error"),
                  message: t.String(),
                  errors: t.Array(
                    t.Object({
                      type: t.String(),
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
                  status: t.Literal("error"),
                  message: t.String(),
                  errors: t.Array(
                    t.Object({
                      type: t.String(),
                      path: t.Array(t.String()),
                      message: t.String(),
                    })
                  ),
                }),
              },
            },
          },
        },
      },
    }
  );

export default userRoutes;
