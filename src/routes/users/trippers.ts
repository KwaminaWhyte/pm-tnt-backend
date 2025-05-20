import { Elysia, t } from "elysia";
import { TripperController } from "~/controllers/TripperController";
import { jwtConfig } from "~/utils/jwt.config";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

const tripperController = new TripperController();

const tripperRoutes = new Elysia({ prefix: "/api/v1/trippers" })
  .use(jwtConfig)

  .derive(async ({ headers, jwt_auth }) => {
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

      // Safely extract the ID from the JWT payload as a string
      const payload = data as Record<string, any>;
      const userId = payload.id || payload._id;

      if (!userId) {
        console.error("No ID found in token payload:", payload);
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
    async ({ query, headers, jwt_auth }) => {
      // Try to extract userId from token if available
      try {
        const auth = headers["authorization"];
        const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

        if (token) {
          const data = await jwt_auth.verify(token);
          if (data) {
            // Safely extract the ID from the JWT payload as a string
            const payload = data as Record<string, any>;
            const userId = payload.id || payload._id;

            if (userId) {
              // Add userId to query params
              query.userId = userId;
            }
          }
        }
      } catch (error) {
        // Silently fail - this just means we won't add hasLiked property
        console.log("No valid auth token found for adding hasLiked property");
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
    async ({ params, headers, jwt_auth, query }) => {
      try {
        const auth = headers["authorization"];
        const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

        if (token) {
          const data = await jwt_auth.verify(token);
          if (data) {
            // Safely extract the ID from the JWT payload as a string
            const payload = data as Record<string, any>;
            const userId = payload.id || payload._id;

            if (userId) {
              // Add userId to query params
              query.userId = userId;
            }
          }
        }
      } catch (error) {
        // Silently fail - this just means we won't add hasLiked property
        console.log("No valid auth token found for adding hasLiked property");
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
      // Pass the authenticated user's ID to the controller
      console.log(
        "POST /posts received with body:",
        JSON.stringify(body, null, 2)
      );
      console.log("Authenticated userId:", userId);

      try {
        const result = await tripperController.createPost({
          body,
          userId,
        } as any);
        console.log("Post creation result:", JSON.stringify(result, null, 2));
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
        location: t.String(),
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
        console.log("File upload request received:", {
          fileType: body.file.type,
          fileSize: `${(body.file.size / (1024 * 1024)).toFixed(2)}MB`,
          fileName: body.file.name,
        });

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

        console.log(`Processing file: ${body.file.name} -> ${newFileName}`);

        // Get the file content and write it to storage
        try {
          const fileContent = await body.file.arrayBuffer();
          await fs.promises.writeFile(filePath, new Uint8Array(fileContent));
          console.log(
            `File saved successfully (${fileContent.byteLength} bytes)`
          );
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

        console.log(`File saved to ${filePath}, accessible at ${fileUrl}`);

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

          console.log(`File saved to ${filePath}, accessible at ${fileUrl}`);

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
