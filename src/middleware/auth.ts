import { JWT } from "@elysiajs/jwt";
import Admin from "~/models/Admin";
import User from "~/models/User";

export interface AuthUser {
  id: string;
  role: "user" | "admin" | "super_admin";
}

export const verifyToken = async ({
  jwt_auth,
  headers,
}: {
  jwt_auth: typeof JWT;
  headers: Record<string, string>;
}): Promise<AuthUser> => {
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
    const payload = (await jwt_auth.verify(token)) as { id: string };
    if (!payload || !payload.id) {
      throw new Error("Invalid token payload");
    }

    // Check if user exists in either admin or user collection
    const admin = await Admin.findById(payload.id);
    if (admin) {
      return { id: admin.id, role: admin.role as "admin" | "super_admin" };
    }

    const user = await User.findById(payload.id);
    if (user) {
      return { id: user.id, role: "user" };
    }

    throw new Error("User not found");
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
            message: "Invalid or expired token",
          },
        ],
      })
    );
  }
};

export const requireAuth = async ({
  jwt_auth,
  headers,
}: {
  jwt_auth: typeof JWT;
  headers: Record<string, string>;
}) => {
  return await verifyToken({ jwt_auth, headers });
};

export const requireAdmin = async ({
  jwt_auth,
  headers,
}: {
  jwt_auth: typeof JWT;
  headers: Record<string, string>;
}) => {
  const user = await verifyToken({ jwt_auth, headers });

  // if (user.role !== "admin" && user.role !== "super_admin") {
  //   throw new Error(
  //     JSON.stringify({
  //       message: "Forbidden",
  //       errors: [
  //         {
  //           type: "AuthError",
  //           path: ["authorization"],
  //           message: "Admin privileges required",
  //         },
  //       ],
  //     })
  //   );
  // }

  return user;
};

export const requireSuperAdmin = async ({
  jwt_auth,
  headers,
}: {
  jwt_auth: typeof JWT;
  headers: Record<string, string>;
}) => {
  const user = await verifyToken({ jwt_auth, headers });

  if (user.role !== "super_admin") {
    throw new Error(
      JSON.stringify({
        message: "Forbidden",
        errors: [
          {
            type: "AuthError",
            path: ["authorization"],
            message: "Super admin privileges required",
          },
        ],
      })
    );
  }

  return user;
};
