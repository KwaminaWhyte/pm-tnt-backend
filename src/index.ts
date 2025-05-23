import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import mongoose from "mongoose";
import fs from "fs";

import { cronJobs } from "./utils/cron";
import { jwtConfig } from "./utils/jwt.config";

import adminsRoutes from "./routes/admins";
import adminAuthRoutes from "./routes/admin/auth";

import userAuthRoutes from "./routes/users/auth";
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
import hotelsRoutes from "./routes/hotels";

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
  .onError(({ error, code, set, request }) => {
    // Log all errors for debugging
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error (${code}):`, error);
    
    // Custom 404 response
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        message: `Route not found: ${request.method} ${request.url}`,
        error: {
          type: "NotFoundError",
          path: [request.url],
          message: "The requested resource does not exist"
        }
      };
    }
    
    // Handle validation errors
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        message: "Validation failed",
        errors: Array.isArray(error.all) ? error.all.map(err => ({
          type: "ValidationError",
          path: err.path || [],
          message: err.message
        })) : [{
          type: "ValidationError",
          path: [],
          message: error.message || "Invalid input data"
        }]
      };
    }
    
    // Handle parse errors (usually JSON parsing)
    if (code === "PARSE") {
      set.status = 400;
      return {
        success: false,
        message: "Failed to parse request data",
        error: {
          type: "ParseError",
          path: [],
          message: error.message || "Invalid request format"
        }
      };
    }
    
    // Handle custom JSON errors (from our controllers)
    if (typeof error === "object" && error !== null && "message" in error) {
      try {
        // Attempt to parse the error if it's in JSON format
        const parsedError = JSON.parse(error.message as string);
        set.status = 400; // Default to 400 for most application errors
        
        return {
          success: false,
          message: parsedError.message || "Request failed",
          errors: parsedError.errors || [{
            type: "ApplicationError",
            path: [],
            message: parsedError.message || "An error occurred processing your request"
          }]
        };
      } catch (e) {
        // Not a JSON error, continue to generic handling
      }
    }
    
    // Handle internal server errors and other unhandled errors
    set.status = code === "INTERNAL_SERVER_ERROR" || typeof code === "number" ? code : 500;
    
    // In production, don't expose internal error details
    const isProduction = process.env.NODE_ENV === "production";
    
    return {
      success: false,
      message: isProduction ? "An internal server error occurred" : (error.message || "Unknown error"),
      error: isProduction ? {
        type: "ServerError",
        path: [],
        message: "Internal server error"
      } : {
        type: error.name || "ServerError",
        path: [],
        message: error.message || "Unknown error",
        stack: isProduction ? undefined : error.stack
      }
    };
  })
  .use(jwtConfig)

  // admin routes
  .use(adminAuthRoutes)
  .use(adminUserRoutes)
  .use(adminsRoutes)

  // user routes
  .use(userAuthRoutes)

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
