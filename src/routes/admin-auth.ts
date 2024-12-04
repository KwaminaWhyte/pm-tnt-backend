import { Elysia, t } from "elysia";
import UserController from "../controllers/UserController";
import { jwtConfig } from "../utils/jwt.config";
import AdminController from "../controllers/AdminController";

const adminAuthRoutes = new Elysia({ prefix: "/api/v1/admin-auth" })
  .use(jwtConfig)
  .decorate("controller", new AdminController())

  .post(
    "/login/email",
    async ({ body, controller }) => await controller.login(body),
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
  );

export default adminAuthRoutes;
