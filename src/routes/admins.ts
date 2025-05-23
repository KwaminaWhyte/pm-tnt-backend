import { Elysia, t } from "elysia";
import AdminController from "~/controllers/AdminController";
import { requireAdmin, requireSuperAdmin } from "~/middleware/auth";

const adminController = new AdminController();

const adminRoutes = new Elysia({ prefix: "/api/v1/admins" })
  .derive(requireAdmin)
  .guard({
    detail: {
      description: "Require admin privileges",
      tags: ["Admins"],
      security: [{ bearerAuth: [] }],
    },
  })
  .get(
    "",
    async ({ query }) => {
      const { page, limit, searchTerm } = query;
      return adminController.getAdmins({ page, limit, searchTerm });
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        searchTerm: t.Optional(t.String()),
      }),
      detail: {
        summary: "List all admins",
      },
    }
  )

  .get("/:id", async ({ params: { id } }) => adminController.getAdmin(id), {
    detail: {
      summary: "Get admin details",
    },
    params: t.Object({
      id: t.String(),
    }),
  })
  .post("", async ({ body }) => adminController.createAdmin(body), {
    detail: {
      summary: "Create a new admin",
    },
    // beforeHandle: [requireSuperAdmin],
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
  )
  .post(
    "/:id/reset-password",
    async ({ params: { id }, body }) => adminController.resetPassword(id, body),
    {
      detail: {
        summary: "Reset admin password (super admin only)",
        tags: ["Admins"],
      },
      beforeHandle: [requireSuperAdmin],
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        password: t.String(),
      }),
    }
  );

export default adminRoutes;
