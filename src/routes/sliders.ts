import { Elysia, t } from "elysia";
import {
  getActiveSliders,
  getAllSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  getSliderById,
} from "~/controllers/slider";

const sliderRoutes = new Elysia({ prefix: "/api/v1/sliders" })
  .guard({
    detail: {
      tags: ["Sliders"],
      security: [{ BearerAuth: [] }],
      description: "Routes for managing banner sliders.",
    },
  })
  // Public routes
  .get("/", async () => {
    return await getActiveSliders();
  })

  .get(
    "/admin",
    async ({ headers, set, jwt_auth }) => {
      const auth = headers["authorization"];
      const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Token is missing",
            },
          ],
        };
      }

      try {
        const data = await jwt_auth.verify(token);
        if (!data || !data.isAdmin) {
          set.status = 403;
          return {
            success: false,
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin privileges required",
              },
            ],
          };
        }
        return await getAllSliders();
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Invalid or expired token",
            },
          ],
        };
      }
    },
    {
      detail: {
        summary: "Get all sliders (admin)",
        description: "Get all sliders for admin access",
      },
    }
  )

  .get(
    "/:id",
    async ({ headers, params, set, jwt_auth }) => {
      const auth = headers["authorization"];
      const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Token is missing",
            },
          ],
        };
      }

      try {
        const data = await jwt_auth.verify(token);
        if (!data || !data.isAdmin) {
          set.status = 403;
          return {
            success: false,
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin privileges required",
              },
            ],
          };
        }
        return await getSliderById(params.id);
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Invalid or expired token",
            },
          ],
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get slider by ID",
        description: "Get a specific slider by its ID",
      },
    }
  )

  .post(
    "/",
    async ({ headers, body, set, jwt_auth }) => {
      const auth = headers["authorization"];
      const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Token is missing",
            },
          ],
        };
      }

      try {
        const data = await jwt_auth.verify(token);
        if (!data || !data.isAdmin) {
          set.status = 403;
          return {
            success: false,
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin privileges required",
              },
            ],
          };
        }
        return await createSlider(body);
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Invalid or expired token",
            },
          ],
        };
      }
    },
    {
      body: t.Object({
        title: t.String(),
        description: t.String(),
        imageUrl: t.String(),
        ctaText: t.String(),
        ctaLink: t.String(),
        order: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Create slider",
        description: "Create a new slider",
      },
    }
  )

  .put(
    "/:id",
    async ({ headers, params, body, set, jwt_auth }) => {
      const auth = headers["authorization"];
      const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Token is missing",
            },
          ],
        };
      }

      try {
        const data = await jwt_auth.verify(token);
        if (!data || !data.isAdmin) {
          set.status = 403;
          return {
            success: false,
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin privileges required",
              },
            ],
          };
        }
        return await updateSlider(params.id, body);
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Invalid or expired token",
            },
          ],
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        ctaText: t.Optional(t.String()),
        ctaLink: t.Optional(t.String()),
        order: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Update slider",
        description: "Update an existing slider",
      },
    }
  )

  .delete(
    "/:id",
    async ({ headers, params, set, jwt_auth }) => {
      const auth = headers["authorization"];
      const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Token is missing",
            },
          ],
        };
      }

      try {
        const data = await jwt_auth.verify(token);
        if (!data || !data.isAdmin) {
          set.status = 403;
          return {
            success: false,
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin privileges required",
              },
            ],
          };
        }
        return await deleteSlider(params.id);
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Invalid or expired token",
            },
          ],
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Delete slider",
        description: "Delete an existing slider",
      },
    }
  );

export default sliderRoutes;
