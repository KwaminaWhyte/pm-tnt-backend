import { Elysia, t } from "elysia";
import { jwtConfig } from "~/utils/jwt.config";
import UserController from "~/controllers/UserController";

const userController = new UserController();

const adminUserRoutes = new Elysia({ prefix: "/api/v1/users" })
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
      await userController.getUsers({
        page: query?.page ? parseInt(query.page as string) : 1,
        limit: query?.limit ? parseInt(query.limit as string) : 10,
        searchTerm: query?.searchTerm as string,
        status: query?.status as string,
      }),
    {
      detail: {
        summary: "List all users",
        tags: ["Users"],
        responses: {
          200: {
            description: "List of users with pagination",
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
        },
      },
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        searchTerm: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // Create user (admin)
  .post("/", async ({ body }) => userController.createUser(body), {
    body: t.Object({
      firstName: t.String(),
      lastName: t.Optional(t.String()),
      email: t.String({ format: "email" }),
      phone: t.String({ pattern: "^\\+?[1-9]\\d{1,14}$" }),
      password: t.Optional(t.String({ minLength: 6 })),
      position: t.Optional(t.String()),
    }),
    detail: {
      summary: "Create a new user",
      tags: ["Users"],
    },
  })

  // Delete user (admin)
  .delete("/:id", async ({ params: { id } }) => userController.deleteUser(id), {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      summary: "Delete a user",
      tags: ["Users"],
    },
  })

  // Admin reset user password
  .put(
    "/:id/password",
    async ({ params: { id }, body }) => {
      // Only admin can reset any user's password
      const { password } = body;
      if (!password || password.length < 6) {
        return {
          status: "error",
          message: "Password must be at least 6 characters long",
        };
      }
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);
      await require("~/models/User").default.findByIdAndUpdate(id, {
        password: hashedPassword,
      });
      return { message: "Password reset successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        password: t.String({ minLength: 6 }),
      }),
      detail: {
        summary: "Admin reset user password",
        tags: ["Users"],
      },
    }
  )

  .put(
    "/:id",
    async ({ params: { id }, body }) => userController.updateUser(id, body),
    {
      detail: {
        summary: "Update an user",
        tags: ["Users"],
      },
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        fullName: t.Optional(t.String()),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  );

export default adminUserRoutes;
