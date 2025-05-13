import { Elysia, t } from "elysia";
import { jwtConfig } from "../../utils/jwt.config";
import AdminController from "../../controllers/AdminController";

const controller = new AdminController();

const adminAuthRoutes = new Elysia({ prefix: "/api/v1/admin-auth" })
  .post(
    "/login",
    async ({ body, jwt_auth }) => await controller.login(body, jwt_auth),
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
      }),
      detail: {
        tags: ["Authentication - Admin"],
        summary: "Login with email and password",
        description: "Authenticate admin using email and password credentials",
        responses: {
          200: {
            description: "Successfully authenticated",
            content: {
              "application/json": {
                schema: t.Object({
                  token: t.String(),
                  user: t.Object({
                    id: t.String(),
                    email: t.String(),
                    firstName: t.String(),
                    lastName: t.Optional(t.String()),
                  }),
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
            description: "Authentication failed",
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

  .get("/profile", async ({ userId }) => await controller.getAdmin(userId), {
    detail: {
      tags: ["Authentication - Admin"],
      summary: "Get current admin profile",
      description: "Get details of the currently authenticated admin",
    },
  });

export default adminAuthRoutes;
