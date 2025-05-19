import { Elysia, t } from "elysia";
import UserController from "../../controllers/UserController";
import { jwtConfig } from "../../utils/jwt.config";

const userController = new UserController();

const authRoutes = new Elysia({ prefix: "/api/v1/user-auth" })
  .post("/register", ({ body }) => userController.register(body), {
    body: t.Object({
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 6 }),
      phone: t.String({ pattern: "^\\+?[0-9]\\d{1,14}$" }),
      firstName: t.String(),
      lastName: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Authentication - User"],
      summary: "Register new user",
      description: "Create a new user account",
    },
  })

  .post(
    "/login/email",
    async ({ body, jwt_auth }) =>
      await userController.loginWithEmail(body, jwt_auth),
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Login with email and password",
        description: "Authenticate user using email and password credentials",
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

  .post(
    "/login/phone",
    async ({ body: { phone } }) => await userController.requestOTP(phone),
    {
      body: t.Object({
        phone: t.String({ pattern: "^\\+?[0-9]\\d{1,14}$" }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Request OTP for phone login",
        description: "Send OTP to the provided phone number for authentication",
        responses: {
          200: {
            description: "OTP sent successfully",
            content: {
              "application/json": {
                schema: t.Object({
                  message: t.String(),
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
          404: {
            description: "User not found",
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
          500: {
            description: "SMS service error",
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

  .post(
    "/verify-otp",
    ({ body, jwt_auth }) => userController.verifyOtp(body, jwt_auth),
    {
      body: t.Object({
        phone: t.String({ pattern: "^\\+?[0-9]\\d{1,14}$" }),
        otp: t.String({ minLength: 6, maxLength: 6 }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Verify OTP for phone login",
        description:
          "Verify the OTP sent to phone number and authenticate user",
        responses: {
          200: {
            description: "OTP verified successfully",
            content: {
              "application/json": {
                schema: t.Object({
                  token: t.String(),
                  user: t.Object({
                    id: t.String(),
                    phone: t.String(),
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
            description: "Invalid or expired OTP",
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

  .post(
    "/verify-email",
    ({ body }) => userController.verifyEmail(body.token, body.email),
    {
      body: t.Object({
        token: t.String(),
        email: t.String(),
        // email: t.String({ format: "email" }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Verify email address",
        description: "Verify user's email address using the verification token",
        // responses: {
        //   200: {
        //     description: "Email verified successfully",
        //     content: {
        //       "application/json": {
        //         schema: t.Object({
        //           message: t.String(),
        //           user: t.Object({
        //             _id: t.String(),
        //             firstName: t.String(),
        //             lastName: t.Optional(t.String()),
        //             email: t.String(),
        //             isEmailVerified: t.Boolean(),
        //           }),
        //         }),
        //       },
        //     },
        //   },
        //   400: {
        //     description: "Invalid or expired verification token",
        //     content: {
        //       "application/json": {
        //         schema: t.Object({
        //           message: t.String(),
        //           errors: t.Array(
        //             t.Object({
        //               type: t.String(),
        //               path: t.Array(t.String()),
        //               message: t.String(),
        //             })
        //           ),
        //         }),
        //       },
        //     },
        //   },
        // },
      },
    }
  )

  .post(
    "/resend-verification-email",
    ({ body }) => userController.resendVerificationEmail(body.email),
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Resend verification email",
        description:
          "Resend the email verification link to the user's email address",
        responses: {
          200: {
            description: "Verification email sent successfully",
            content: {
              "application/json": {
                schema: t.Object({
                  message: t.String(),
                }),
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: t.Object({
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

export default authRoutes;
