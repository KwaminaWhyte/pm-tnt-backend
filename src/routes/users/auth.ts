import { Elysia, t } from "elysia";
import UserController from "~/controllers/UserController";
import UserAuthController from "~/controllers/users/UserAuthController";

const userController = new UserController();
const userAuthController = new UserAuthController();

const authRoutes = new Elysia({ prefix: "/api/v1/user-auth" })
  .post("/register", ({ body }) => userAuthController.register(body), {
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
    "/login",
    async ({ body, jwt_auth }) =>
      await userAuthController.loginWithEmail(body, jwt_auth),
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Login with email and password",
        description: "Authenticate user using email and password credentials",
      },
    }
  )

  .post(
    "/login/phone",
    async ({ body: { phone } }) => await userAuthController.requestOTP(phone),
    {
      body: t.Object({
        phone: t.String({ pattern: "^\\+?[0-9]\\d{1,14}$" }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Request OTP for phone login",
        description: "Send OTP to the provided phone number for authentication",
      },
    }
  )

  .post(
    "/verify-otp",
    ({ body, jwt_auth }) => userAuthController.verifyOtp(body, jwt_auth),
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
      },
    }
  )

  .post(
    "/verify-email",
    ({ body }) => userAuthController.verifyEmail(body.token, body.email),
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
      },
    }
  )

  .get(
    "/verify-email",
    ({ query }) => userAuthController.verifyEmail(query.token, query.email),
    {
      query: t.Object({
        token: t.String(),
        email: t.String(),
        // email: t.String({ format: "email" }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Verify email address",
        description: "Verify user's email address using the verification token",
      },
    }
  )

  .post(
    "/resend-verification-email",
    ({ body }) => userAuthController.resendVerificationEmail(body.email),
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
      detail: {
        tags: ["Authentication - User"],
        summary: "Resend verification email",
        description:
          "Resend the email verification link to the user's email address",
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
  .get("/me", async ({ userId }) => userController.getUser(userId), {
    detail: {
      tags: ["Users"],
      summary: "Get current user profile",
      description:
        "Retrieve the profile information of the currently authenticated user",
      security: [{ bearerAuth: [] }],
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
      },
    }
  )
  .put(
    "/me/password",
    async ({ userId, body: { currentPassword, newPassword } }) =>
      userAuthController.changePassword({
        userId,
        currentPassword,
        newPassword,
      }),
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
      },
    }
  );

export default authRoutes;
