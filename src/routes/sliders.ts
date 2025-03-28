import { Elysia, t } from "elysia";
import {
  getActiveSliders,
  getAllSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  getSliderById,
} from "../controllers/slider";
import { jwtConfig } from "../utils/jwt.config";

const sliderRoutes = new Elysia({ prefix: "/api/v1/sliders" })
  // Public routes
  .get("/", async () => {
    return await getActiveSliders();
  })

  // Admin routes (protected)
  .use(jwtConfig)
  .get("/admin", async ({ headers, jwt_auth }) => {
    // Verify token
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
      if (!data.isAdmin) {
        throw new Error(
          JSON.stringify({
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin privileges required",
              },
            ],
          })
        );
      }
      return await getAllSliders();
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

  .get("/:id", async ({ headers, jwt_auth, params }) => {
    // Verify token
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
      if (!data.isAdmin) {
        throw new Error(
          JSON.stringify({
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin privileges required",
              },
            ],
          })
        );
      }
      return await getSliderById(params.id);
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

  .post(
    "/",
    async ({ headers, jwt_auth, body }) => {
      // Verify token
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
        if (!data.isAdmin) {
          throw new Error(
            JSON.stringify({
              message: "Forbidden",
              errors: [
                {
                  type: "AuthError",
                  path: ["authorization"],
                  message: "Admin privileges required",
                },
              ],
            })
          );
        }
        return await createSlider(body);
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
    }
  )

  .put(
    "/:id",
    async ({ headers, jwt_auth, params, body }) => {
      // Verify token
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
        if (!data.isAdmin) {
          throw new Error(
            JSON.stringify({
              message: "Forbidden",
              errors: [
                {
                  type: "AuthError",
                  path: ["authorization"],
                  message: "Admin privileges required",
                },
              ],
            })
          );
        }
        return await updateSlider(params.id, body);
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
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        ctaText: t.Optional(t.String()),
        ctaLink: t.Optional(t.String()),
        order: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  .delete("/:id", async ({ headers, jwt_auth, params }) => {
    // Verify token
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
      if (!data.isAdmin) {
        throw new Error(
          JSON.stringify({
            message: "Forbidden",
            errors: [
              {
                type: "AuthError",
                path: ["authorization"],
                message: "Admin privileges required",
              },
            ],
          })
        );
      }
      return await deleteSlider(params.id);
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
  });

export default sliderRoutes;
