import { JWT } from "@elysiajs/jwt";

export interface AuthUser {
  id: string;
  role: string;
}

export const isAdmin = async ({
  jwt_auth,
  headers,
}: {
  jwt_auth: typeof JWT;
  headers: Record<string, string>;
}) => {
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
            message: "Admin token is missing",
          },
        ],
      })
    );
  }

  try {
    const payload = (await jwt_auth.verify(token)) as AuthUser;

    if (!payload || payload.role !== "admin") {
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

    return payload;
  } catch (error) {
    if (error instanceof Error && error.message.includes("status")) {
      throw error;
    }
    throw new Error(
      JSON.stringify({
        message: "Unauthorized",
        errors: [
          {
            type: "AuthError",
            path: ["authorization"],
            message: "Invalid or expired admin token",
          },
        ],
      })
    );
  }
};
