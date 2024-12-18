import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";

import { jwtConfig } from "./utils/jwt.config";
import userAuthRoutes from "./routes/user-auth";
import vehiclesRoutes from "./routes/vehicles";
import vehiclesPublicRoutes from "./routes/vehicles-public";
import adminsRoutes from "./routes/admin";
import usersRoutes from "./routes/users";
import adminAuthRoutes from "./routes/admin-auth";
import hotelsRoutes from "./routes/hotels";
import hotelsPublicRoutes from "./routes/hotels-public";
import roomRoutes from "./routes/rooms";
import packageRoutes from "./routes/packages";
import destinationRoutes from "./routes/destinations";
import favoritesRoutes from "./routes/favorites";
import bookingRoutes from "./routes/bookings";

const app = new Elysia()
  .use(
    cors({
      origin: "*",
      methods: "*",
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    })
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: "PM Travel and Tourism API",
          description:
            "This is the documentation for PM Travel and Tourism API",
          version: "0.0.1",
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
      },
    })
  )
  .use(jwtConfig)
  .use(userAuthRoutes)
  .use(adminAuthRoutes)
  .use(vehiclesRoutes)
  .use(vehiclesPublicRoutes)
  .use(adminsRoutes)
  .use(usersRoutes)
  .use(hotelsPublicRoutes)
  .use(hotelsRoutes)
  .use(roomRoutes)
  .use(packageRoutes)
  .use(bookingRoutes)
  .use(favoritesRoutes)
  .use(destinationRoutes);

app.onError(({ error, code }) => {
  console.log(error, code);

  if (code === "NOT_FOUND") return;

  let errorResponse = {
    status: "error",
    statusCode: error.status || 500,
    message: "An unexpected error occurred",
    errors: []
  };

  try {
    // Handle JSON string error messages
    if (typeof error.message === "string" && error.message.startsWith("{")) {
      const parsedError = JSON.parse(error.message);
      errorResponse.message = parsedError.message;
      errorResponse.errors = parsedError.errors || [];
    } 
    // Handle standard Error objects
    else if (error instanceof Error) {
      errorResponse.message = error.message;
      if ('errors' in error && Array.isArray(error.errors)) {
        errorResponse.errors = error.errors;
      }
    }

    // Add request ID for tracking (optional)
    errorResponse.requestId = crypto.randomUUID();

    return errorResponse;
  } catch (e) {
    // Fallback for unparseable errors
    return {
      status: "error",
      statusCode: 500,
      message: error.message || "An unexpected error occurred",
      requestId: crypto.randomUUID(),
      errors: []
    };
  }
});

app.get("/", () => {
  return {
    name: "PM Travel and Tourism API",
    version: "0.0.1",
    description:
      "Backend API for PM Travel and Tourism vehicle management system",
    endpoints: {
      auth: "/api/v1/user-auth",
      users: "/api/v1/users",
      vehicles: "/api/v1/vehicles",
      admin: "/api/v1/admins",
    },
  };
});

app.listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
