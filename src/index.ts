import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";
import userAuthRoutes from "./routes/user-auth";
import vehicleRoutes from "./routes/vehicle-routes";
import adminRoutes from "./routes/admin-routes";
import userRoutes from "./routes/users";

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
  .use(userAuthRoutes)
  .use(vehicleRoutes)
  .use(adminRoutes)
  .use(userRoutes);

app.onError(({ error, code }) => {
  if (code === "NOT_FOUND") return;

  let errorMessage;

  try {
    // Attempt to parse the error if it's in JSON format and matches your error structure
    const parsedError = JSON.parse(error.message);
    errorMessage = {
      status: "error",
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
      status: "error",
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
    description: "Backend API for PM Travel and Tourism vehicle management system",
    endpoints: {
      auth: "/api/v1/user-auth",
      users: "/api/v1/users",
      vehicles: "/api/v1/vehicles",
      admin: "/api/v1/admins"
    }
  };
});

app.listen(1464);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
