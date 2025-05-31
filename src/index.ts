import { Elysia, t } from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import mongoose from "mongoose";
import fs from "fs";

import { cronJobs } from "./utils/cron";
import { jwtConfig } from "./utils/jwt.config";
import {
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ServerError,
  DuplicateError,
  BadRequestError,
} from "./utils/errors";

import adminsRoutes from "./routes/admins";
import adminAuthRoutes from "./routes/admin/auth";

import userAuthRoutes from "./routes/users/auth";
import tripperRoutes from "./routes/users/trippers";
import userSecurityRoutes from "./routes/users/security";

import roomRoutes from "./routes/rooms";
import packageRoutes from "./routes/packages";
import destinationRoutes from "./routes/destinations";
import favoritesRoutes from "./routes/favorites";
import bookingRoutes from "./routes/bookings";
import settingsRoutes from "./routes/settings";
import reviewsRoutes from "./routes/reviews";
import sliderRoutes from "./routes/sliders";
import notificationRoutes from "./routes/notifications";
import activitiesRoutes from "./routes/activities";
import adminUserRoutes from "./routes/admin/users";
import vehiclesRoutes from "./routes/vehicles";
import hotelsRoutes from "./routes/hotels";

import { loggerMiddleware } from "./middleware/logger.middleware";
import { globalErrorHandler } from "./middleware/error.middleware";
import fileServer from "./utils/fileServer";

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
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

  // custom middlewares
  .use(cronJobs)
  .use(fileServer)

  // global middlewares
  .use(loggerMiddleware)
  .use(globalErrorHandler)

  .error({
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ServerError,
    DuplicateError,
    BadRequestError,
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

  // admin routes
  .use(adminAuthRoutes)
  .use(adminUserRoutes)
  .use(adminsRoutes)

  // user routes
  .use(userAuthRoutes)
  .use(userSecurityRoutes)

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

  .use(hotelsRoutes)
  .use(activitiesRoutes)
  .use(vehiclesRoutes);

app.get("/", () => {
  return {
    name: "PM Travel and Tour API",
    version: "0.3.1",
    description:
      "Backend API for PM Travel and Tourism vehicle management system",
  };
});

const PORT = process.env.PORT || 3310;
const HOST = process.env.HOST || "0.0.0.0";

app.listen({
  port: Number(PORT),
  hostname: HOST,
});

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
