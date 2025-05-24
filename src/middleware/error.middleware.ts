import { Elysia } from "elysia";
// import { AppError } from '../utils/errors'
// import { createErrorResponse } from '../utils/response'
// import { config } from '../config'

export const globalErrorHandler = new Elysia().onError(
  ({ error, code, set, request }) => {
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
          message: "The requested resource does not exist",
        },
      };
    }

    // Handle validation errors
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        message: "Validation failed",
        errors: Array.isArray(error.all)
          ? error.all.map((err) => ({
              type: "ValidationError",
              path: err.path || [],
              message: err.message,
            }))
          : [
              {
                type: "ValidationError",
                path: [],
                message: error.message || "Invalid input data",
              },
            ],
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
          message: error.message || "Invalid request format",
        },
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
          errors: parsedError.errors || [
            {
              type: "ApplicationError",
              path: [],
              message:
                parsedError.message ||
                "An error occurred processing your request",
            },
          ],
        };
      } catch (e) {
        // Not a JSON error, continue to generic handling
      }
    }

    // Handle internal server errors and other unhandled errors
    set.status =
      code === "INTERNAL_SERVER_ERROR" || typeof code === "number" ? code : 500;

    // In production, don't expose internal error details
    const isProduction = process.env.NODE_ENV === "production";

    return {
      success: false,
      message: isProduction
        ? "An internal server error occurred"
        : error.message || "Unknown error",
      error: isProduction
        ? {
            type: "ServerError",
            path: [],
            message: "Internal server error",
          }
        : {
            type: error.name || "ServerError",
            path: [],
            message: error.message || "Unknown error",
            stack: isProduction ? undefined : error.stack,
          },
    };
  }
);
