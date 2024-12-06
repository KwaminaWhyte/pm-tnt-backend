import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";
import userAuthRoutes from "./routes/user-auth";
import vehiclesRoutes from "./routes/vehicles";
import vehiclesPublicRoutes from "./routes/vehicles-public";
import adminsRoutes from "./routes/admin";
import usersRoutes from "./routes/users";
import adminAuthRoutes from "./routes/admin-auth";
import hotelsRoutes from "./routes/hotels";
import hotelsPublicRoutes from "./routes/hotels-public";
import { jwtConfig } from "./utils/jwt.config";

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
  .use(hotelsRoutes);

app.onError(({ error, code }) => {
  console.log(error, code);

  if (code === "NOT_FOUND") return;

  let errorMessage;

  try {
    // Attempt to parse the error if it's in JSON format and matches your error structure
    const parsedError = JSON.parse(error.message);
    errorMessage = {
      message: parsedError.message || "Validation failed",
      data: parsedError.errors
        ? parsedError.errors.map((err) => ({
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
    },
  };
});

app.listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
