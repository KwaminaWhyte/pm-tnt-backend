import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import AdminController from "../controllers/AdminController";

const adminController = new AdminController();

const adminRoutes = new Elysia({ prefix: "/api/v1/admins" })
  .use(jwtConfig)
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
  .get(
    "/",
    async ({ query }) => {
      const { page, limit, searchTerm } = query;
      return adminController.getAdmins({ page, limit, searchTerm });
    },
    {
      detail: {
        summary: "List all admins",
        tags: ["Admins"],
        responses: {
          200: {
            description: "List of admins with pagination",
            content: {
              "application/json": {
                schema: t.Object({
                  success: t.Boolean(),
                  data: t.Array(t.Any()),
                  pagination: t.Object({
                    currentPage: t.Number(),
                    totalPages: t.Number(),
                    totalItems: t.Number(),
                    itemsPerPage: t.Number()
                  })
                })
              }
            }
          }
        }
      },
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        searchTerm: t.Optional(t.String()),
      }),
    }
  )
  .get("/me", async ({ userId }) => await adminController.getAdmin(userId), {
    detail: {
      summary: "Get current admin profile",
      tags: ["Admins"],
    },
  })
  .get("/:id", async ({ params: { id } }) => adminController.getAdmin(id), {
    detail: {
      summary: "Get admin details",
      tags: ["Admins"],
    },
    params: t.Object({
      id: t.String(),
    }),
  })
  .post("/", async ({ body }) => adminController.createAdmin(body), {
    detail: {
      summary: "Create a new admin",
      tags: ["Admins"],
    },
    body: t.Object({
      fullName: t.String(),
      email: t.String(),
      password: t.String(),
      role: t.Optional(t.Union([t.Literal("admin"), t.Literal("super_admin")])),
    }),
  })
  .put(
    "/:id",
    async ({ params: { id }, body }) => adminController.updateAdmin(id, body),
    {
      detail: {
        summary: "Update an admin",
        tags: ["Admins"],
      },
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        fullName: t.Optional(t.String()),
        email: t.Optional(t.String()),
        role: t.Optional(
          t.Union([t.Literal("admin"), t.Literal("super_admin")])
        ),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ params: { id } }) => adminController.deleteAdmin(id),
    {
      detail: {
        summary: "Delete an admin",
        tags: ["Admins"],
      },
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/change-password",
    async ({ params: { id }, body }) =>
      adminController.changePassword(id, body),
    {
      detail: {
        summary: "Change admin password",
        tags: ["Admins"],
      },
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        currentPassword: t.String(),
        newPassword: t.String(),
      }),
    }
  );

export default adminRoutes;
