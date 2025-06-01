import { Elysia, t } from "elysia";
import { TripperController } from "~/controllers/TripperController";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

// Define the JWT auth interface
interface JWTAuth {
  verify: (token: string) => Promise<any>;
}

// Define the custom context type
type CustomContext = {
  headers: Record<string, string | undefined>;
  jwt_auth: JWTAuth;
};

const tripperController = new TripperController();

const tripperRoutes = new Elysia({ prefix: "/api/v1/trippers" })

  .derive(async (context) => {
    const { headers, jwt_auth } = context as unknown as CustomContext;
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
      const data = await jwt_auth.verify(token);

      if (!data) {
        throw new Error("Invalid token");
      }
      const payload = data as Record<string, any>;

      const userId = payload.userId;

      if (!userId) {
        throw new Error("User ID not found in token");
      }

      return { userId };
    } catch (error) {
      console.error("JWT verification error:", error);
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
  })

  .get(
    "/posts",
    async ({ query, headers, userId }) => {
      if (userId) {
        // Add userId to query params
        query.userId = userId;
      }

      return await tripperController.getAllPosts({ query } as any);
    },
    {
      query: t.Object({
        sort: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        page: t.Optional(t.String()),
        type: t.Optional(t.String()),
        location: t.Optional(t.String()),
        user: t.Optional(t.String()),
        userId: t.Optional(t.String()), // Allow userId to be passed explicitly (but will be overridden by token)
      }),
      detail: {
        summary: "Get all posts with pagination and filtering",
        tags: ["Tripper - Auth User"],
      },
    }
  )
  .get(
    "/posts/:id",
    async ({ params, headers, userId, query }) => {
      if (userId) {
        // Add userId to query params
        query.userId = userId;
      }
      return await tripperController.getPostById({
        params,
        query,
      } as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get a post by ID",
        tags: ["Tripper - Auth User"],
      },
    }
  )

  .post(
    "/posts",
    async ({ body, userId }) => {
      try {
        const result = await tripperController.createPost({
          body,
          userId,
        } as any);

        return result;
      } catch (error) {
        console.error("Error in post creation route:", error);
        return {
          status: false,
          message:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        };
      }
    },
    {
      body: t.Object({
        caption: t.String(),
        media: t.Array(
          t.Object({
            url: t.String(),
            type: t.Union([t.Literal("image"), t.Literal("video")]),
          })
        ),
        location: t.Object({
          name: t.String(),
          coordinates: t.Optional(t.Array(t.Number())),
          city: t.Optional(t.String()),
          country: t.Optional(t.String()),
        }),
      }),
      detail: {
        summary: "Create a new post",
        tags: ["Tripper - Auth User"],
      },
    }
  )

  .put(
    "/posts/:id/react",
    async ({ params, body, userId }) => {
      return await tripperController.updateReactions({
        params,
        body,
        userId,
      } as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        action: t.Union([t.Literal("like"), t.Literal("dislike")]),
      }),
      detail: {
        summary: "Update post reactions (like/dislike)",
        tags: ["Tripper - Auth User"],
      },
    }
  )

  .post(
    "/posts/:id/comment",
    async ({ params, body, userId }) => {
      return await tripperController.addComment({
        params,
        body,
        userId,
      } as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        text: t.String(),
      }),
      detail: {
        summary: "Add a comment to a post",
        tags: ["Tripper - Auth User"],
      },
    }
  )

  .put(
    "/posts/:id/comments/:commentId/like",
    async ({ params, userId }) => {
      return await tripperController.likeComment({ params, userId } as any);
    },
    {
      params: t.Object({
        id: t.String(),
        commentId: t.String(),
      }),
      detail: {
        summary: "Like a comment",
        tags: ["Tripper - Auth User"],
      },
    }
  )

  .post(
    "/upload/media",
    async ({ body, userId }) => {
      // Handle the file upload
      try {
        // Create storage directory if it doesn't exist
        const baseDir = "storage/trippers";
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }

        // Generate a secure unique filename
        const fileExtension =
          body.file.name.split(".").pop()?.toLowerCase() || "unknown";
        const allowedVideoExtensions = ["mp4", "mov", "avi"];
        const allowedImageExtensions = ["jpg", "jpeg", "png", "gif"];

        // Determine appropriate extension
        let finalExtension = fileExtension;
        if (body.file.type.startsWith("video/")) {
          // If it's a video but has wrong extension, ensure it's mp4
          if (!allowedVideoExtensions.includes(fileExtension)) {
            finalExtension = "mp4";
          }
        } else if (body.file.type.startsWith("image/")) {
          // If it's an image but has wrong extension, use appropriate one
          if (!allowedImageExtensions.includes(fileExtension)) {
            if (
              body.file.type === "image/jpeg" ||
              body.file.type === "image/jpg"
            ) {
              finalExtension = "jpg";
            } else if (body.file.type === "image/png") {
              finalExtension = "png";
            } else {
              finalExtension = "jpg"; // Default
            }
          }
        }

        const uniqueId = crypto.randomUUID();
        const newFileName = `${uniqueId}.${finalExtension}`;
        const filePath = path.join(baseDir, newFileName);

        // Get the file content and write it to storage
        try {
          const fileContent = await body.file.arrayBuffer();
          await fs.promises.writeFile(filePath, new Uint8Array(fileContent));
        } catch (writeError) {
          console.error("Error writing file:", writeError);
          return {
            status: false,
            message: "Failed to write file to storage",
            error:
              writeError instanceof Error
                ? writeError.message
                : "Unknown error",
          };
        }

        // Get the server domain from environment or use default
        const domain = process.env.API_URL || "http://localhost:3310";

        // Use the new dynamic path format for file URLs
        const fileUrl = `${domain}/storage/trippers/${newFileName}`;

        return {
          status: true,
          message: "File uploaded successfully",
          url: fileUrl,
          fileName: newFileName,
          fileSize: body.file.size,
          fileType: body.file.type,
        };
      } catch (error) {
        console.error("Error uploading file:", error);
        return {
          status: false,
          message: "Failed to upload file",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      body: t.Object({
        file: t.File({
          format: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "video/mp4",
            "video/quicktime",
          ],
          maxSize: 15 * 1024 * 1024, // Increase to 15MB max size for videos
        }),
      }),
      detail: {
        summary: "Upload a single media file",
        tags: ["Tripper - Auth User"],
      },
    }
  )

  .post(
    "/upload/multiple",
    async ({ body, userId }) => {
      try {
        // Create storage directory if it doesn't exist
        const baseDir = "storage/trippers";
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }

        const files = Array.isArray(body.files) ? body.files : [body.files];
        const results = [];

        for (const file of files) {
          // Generate a secure unique filename
          const fileExtension = file.name.split(".").pop() || "unknown";
          const uniqueId = crypto.randomUUID();
          const newFileName = `${uniqueId}.${fileExtension}`;
          const filePath = path.join(baseDir, newFileName);

          // Determine file type (image or video)
          const fileType = file.type.startsWith("image/") ? "image" : "video";

          // Get the file content and write it to storage
          const fileContent = await file.arrayBuffer();
          await fs.promises.writeFile(filePath, new Uint8Array(fileContent));

          // Get the server domain from environment or use default
          const domain = process.env.API_URL || "http://localhost:3310";

          // Use the new dynamic path format for file URLs
          const fileUrl = `${domain}/storage/trippers/${newFileName}`;

          results.push({
            url: fileUrl,
            type: fileType,
            fileName: newFileName,
            fileSize: file.size,
            fileType: file.type,
          });
        }

        return {
          status: true,
          message: `${results.length} file(s) uploaded successfully`,
          files: results,
        };
      } catch (error) {
        console.error("Error uploading files:", error);
        return {
          status: false,
          message: "Failed to upload files",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      body: t.Object({
        files: t.Union([
          t.File({
            format: ["image/jpeg", "image/png", "image/gif", "video/mp4"],
            maxSize: 10 * 1024 * 1024, // 10MB max size
          }),
          t.Array(
            t.File({
              format: ["image/jpeg", "image/png", "image/gif", "video/mp4"],
              maxSize: 10 * 1024 * 1024, // 10MB max size
            })
          ),
        ]),
      }),
      detail: {
        summary: "Upload multiple media files",
        tags: ["Tripper - Auth User"],
      },
    }
  )

  .delete(
    "/posts/:id",
    async ({ params, userId }) => {
      // Owner check would be implemented in controller
      return await tripperController.deletePost({ params, userId } as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Delete a post",
        tags: ["Tripper - Auth User"],
      },
    }
  );

export default tripperRoutes;
