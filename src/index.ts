import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";
import mongoose from "mongoose";
import { staticPlugin } from "@elysiajs/static";

import { jwtConfig } from "./utils/jwt.config";
import userAuthRoutes from "./routes/user-auth";
import vehiclesRoutes from "./routes/vehicles";
import vehiclesPublicRoutes from "./routes/vehicles-public";
import adminsRoutes from "./routes/admins";
import usersRoutes from "./routes/users";
import adminAuthRoutes from "./routes/admin-auth";
import hotelAdminRoutes from "./routes/hotels-admin";
import hotelPublicRoutes from "./routes/hotels-public";
import roomRoutes from "./routes/rooms";
import packageRoutes from "./routes/packages";
import destinationRoutes from "./routes/destinations";
import favoritesRoutes from "./routes/favorites";
import bookingRoutes from "./routes/bookings";
import settingsRoutes from "./routes/settings";
import reviewsRoutes from "./routes/reviews";
import sliderRoutes from "./routes/sliders";
import notificationRoutes from "./routes/notifications";
import tripperRoutes from "./routes/trippers";
import activitiesRoutes from "./routes/activities";

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/pm-tnt")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const app = new Elysia()
  .use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? ["https://pm-tnt.com", "https://admin.pm-tnt.com"]
          : ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400, // 24 hours
    })
  )
  .use(
    staticPlugin({
      prefix: "/storage",
      assets: "storage",
      decorate: "request",
    })
  )
  // Add request logging
  .onRequest(({ request }) => {
    const timestamp = new Date().toISOString();
    const method = request.method;
    const url = request.url;
    console.log(`[${timestamp}] ${method} ${url}`);
  })
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
  .use(hotelPublicRoutes)
  .use(hotelAdminRoutes)
  .use(roomRoutes)
  .use(packageRoutes)
  .use(bookingRoutes)
  .use(favoritesRoutes)
  .use(destinationRoutes)
  .use(settingsRoutes)
  .use(reviewsRoutes)
  .use(sliderRoutes)
  .use(notificationRoutes)
  .use(tripperRoutes)
  .use(activitiesRoutes);

app.onError(({ error, code }) => {
  console.log(error, code);

  if (code === "NOT_FOUND") return;

  let errorMessage;

  try {
    // Check if error message is a string (for custom JSON errors)
    if (typeof error === "object" && error !== null && "message" in error) {
      try {
        // Attempt to parse the error if it's in JSON format
        const parsedError = JSON.parse(error.message as string);
        errorMessage = {
          message: parsedError.message || "Validation failed",
          data: parsedError.errors
            ? parsedError.errors.map((err: any) => ({
                type: err.type,
                schema: err.schema,
                path: err.path,
                value: err.value,
                message: err.message,
                summary: err.summary,
              }))
            : null,
        };
      } catch (e) {
        // Fallback in case parsing fails
        errorMessage = {
          message: error.message || "An unknown error occurred",
          data: null,
        };
      }
    } else {
      errorMessage = {
        message: "An unknown error occurred",
        data: null,
      };
    }
  } catch (e) {
    errorMessage = {
      message: "Error processing the request",
      data: null,
    };
  }

  return errorMessage;
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
      settings: "/api/v1/settings",
      reviews: "/api/v1/reviews",
      sliders: "/api/v1/sliders",
      trippers: "/api/v1/trippers",
      hotels: {
        public: "/api/v1/hotels/public",
        admin: "/api/v1/hotels/admin",
      },
      activities: {
        public: "/api/v1/activities/public",
        admin: "/api/v1/activities/admin",
      },
    },
  };
});

app.listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
