import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import mongoose from "mongoose";
import fs from "fs";

import { cronJobs } from "./utils/cron";
import { jwtConfig } from "./utils/jwt.config";

import adminsRoutes from "./routes/admins";
import adminAuthRoutes from "./routes/admin/auth";
import adminHotelRoutes from "./routes/admin/hotels";

import userAuthRoutes from "./routes/users/auth";
import hotelPublicRoutes from "./routes/users/hotels";
import tripperRoutes from "./routes/users/trippers";

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
  // Use cron jobs
  .use(cronJobs)
  // Add dynamic file serving route
  .get("/storage/:folder/:filename", ({ params }) => {
    try {
      const { folder, filename } = params;
      const filepath = `storage/${folder}/${filename}`;

      // Check if file exists before returning
      if (!fs.existsSync(filepath)) {
        return new Response("File not found", { status: 404 });
      }

      // Determine content type based on file extension
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      let contentType = "application/octet-stream"; // Default

      // Set appropriate content type
      if (["jpg", "jpeg"].includes(ext)) {
        contentType = "image/jpeg";
      } else if (ext === "png") {
        contentType = "image/png";
      } else if (ext === "gif") {
        contentType = "image/gif";
      } else if (ext === "mp4") {
        contentType = "video/mp4";
      } else if (ext === "mov" || ext === "qt") {
        contentType = "video/quicktime";
      } else if (ext === "avi") {
        contentType = "video/x-msvideo";
      }

      // Get file and set content type
      const file = Bun.file(filepath);
      return new Response(file, {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    } catch (error) {
      console.error("Error serving file:", error);
      return new Response("Error serving file", { status: 500 });
    }
  })
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

  // admin routes
  .use(adminAuthRoutes)
  .use(adminUserRoutes)
  .use(adminHotelRoutes)
  .use(adminsRoutes)

  // user routes
  .use(userAuthRoutes)

  .use(hotelPublicRoutes)
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
  .use(activitiesRoutes)
  .use(vehiclesRoutes);
app.onError(({ error, code }) => {
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

  console.log(errorMessage);
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

const PORT = process.env.PORT || 3310;
const HOST = process.env.HOST || "0.0.0.0";

app.listen({
  port: Number(PORT),
  hostname: HOST,
});

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
