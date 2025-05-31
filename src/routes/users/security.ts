import { Elysia, t } from "elysia";
import SecurityController from "~/controllers/users/SecurityController";

const securityController = new SecurityController();

// Define the JWT auth interface
interface JWTAuth {
  verify: (token: string) => Promise<any>;
}

// Define the custom context type
type CustomContext = {
  headers: Record<string, string | undefined>;
  jwt_auth: JWTAuth;
};

/**
 * User security routes
 * Base path: /api/v1/users/security
 */
const userSecurityRoutes = new Elysia({ prefix: "/api/v1/users/security" })
  .derive(async (context) => {
    const { headers, jwt_auth } = context as unknown as CustomContext;
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

      if (!data) {
        throw new Error("Invalid token");
      }
      const payload = data as Record<string, any>;

      const userId = payload.userId;

      if (!userId) {
        throw new Error("User ID not found in token");
      }

      return { userId };
    } catch (error) {
      console.error("JWT verification error:", error);
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
  // Change Password
  .put(
    "/change-password",
    async ({ body, userId, headers }) => {
      const currentToken = headers.authorization?.replace("Bearer ", "") || "";

      return await securityController.changePassword({
        userId: userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        currentToken,
      });
    },
    {
      body: t.Object({
        currentPassword: t.String({
          minLength: 1,
          description: "Current password",
        }),
        newPassword: t.String({
          minLength: 8,
          description: "New password (minimum 8 characters)",
        }),
      }),
      detail: {
        summary: "Change user password",
        description: "Updates user password with validation",
        tags: ["Security"],
      },
    }
  )

  // Setup Two-Factor Authentication
  .post(
    "/2fa/setup",
    async ({ userId }) => {
      return await securityController.setupTwoFactor({
        userId: userId,
      });
    },
    {
      detail: {
        summary: "Setup Two-Factor Authentication",
        description: "Generates QR code and secret for 2FA setup",
        tags: ["Security"],
      },
    }
  )

  // Enable Two-Factor Authentication
  .post(
    "/2fa/enable",
    async ({ body, userId }) => {
      return await securityController.enableTwoFactor({
        userId: userId,
        token: body.token,
      });
    },
    {
      body: t.Object({
        token: t.String({
          minLength: 6,
          maxLength: 6,
          description: "6-digit verification token from authenticator app",
        }),
      }),
      detail: {
        summary: "Enable Two-Factor Authentication",
        description: "Verifies token and enables 2FA for user",
        tags: ["Security"],
      },
    }
  )

  // Disable Two-Factor Authentication
  .post(
    "/2fa/disable",
    async ({ body, userId }) => {
      return await securityController.disableTwoFactor({
        userId: userId,
        token: body.token,
        password: body.password,
      });
    },
    {
      body: t.Object({
        token: t.String({
          minLength: 6,
          maxLength: 6,
          description: "6-digit verification token from authenticator app",
        }),
        password: t.String({
          minLength: 1,
          description: "User password for verification",
        }),
      }),
      detail: {
        summary: "Disable Two-Factor Authentication",
        description: "Disables 2FA after password and token verification",
        tags: ["Security"],
      },
    }
  )

  // Get Active Sessions
  .get(
    "/sessions",
    async ({ userId, headers }) => {
      const currentToken = headers.authorization?.replace("Bearer ", "") || "";

      return await securityController.getActiveSessions({
        userId: userId,
        currentToken,
      });
    },
    {
      detail: {
        summary: "Get Active Sessions",
        description: "Retrieves all active sessions for the user",
        tags: ["Security"],
      },
    }
  )

  // Terminate Session
  .delete(
    "/sessions/:sessionId",
    async ({ params, userId, headers }) => {
      const currentToken = headers.authorization?.replace("Bearer ", "") || "";

      return await securityController.terminateSession({
        sessionId: params.sessionId,
        userId: userId,
        currentToken,
      });
    },
    {
      params: t.Object({
        sessionId: t.String({
          description: "Session ID to terminate",
        }),
      }),
      detail: {
        summary: "Terminate Session",
        description: "Terminates a specific user session",
        tags: ["Security"],
      },
    }
  )

  // Logout All Devices
  .post(
    "/logout-all",
    async ({ body, userId, headers }) => {
      const currentToken = headers.authorization?.replace("Bearer ", "") || "";

      return await securityController.logoutAllDevices({
        userId: userId,
        password: body.password,
        currentToken,
      });
    },
    {
      body: t.Object({
        password: t.String({
          minLength: 1,
          description: "User password for verification",
        }),
      }),
      detail: {
        summary: "Logout All Devices",
        description:
          "Logs out user from all devices after password verification",
        tags: ["Security"],
      },
    }
  )

  // Toggle Biometric Authentication
  .post(
    "/biometric",
    async ({ body, userId }) => {
      return await securityController.toggleBiometric({
        userId: userId,
        enabled: body.enabled,
      });
    },
    {
      body: t.Object({
        enabled: t.Boolean({
          description: "Enable or disable biometric authentication",
        }),
      }),
      detail: {
        summary: "Toggle Biometric Authentication",
        description: "Enables or disables biometric authentication for user",
        tags: ["Security"],
      },
    }
  )

  // Get Security Overview
  .get(
    "/overview",
    async ({ userId }) => {
      return await securityController.getSecurityOverview({
        userId: userId,
      });
    },
    {
      detail: {
        summary: "Get Security Overview",
        description: "Retrieves security settings and status overview",
        tags: ["Security"],
      },
    }
  );

export default userSecurityRoutes;
