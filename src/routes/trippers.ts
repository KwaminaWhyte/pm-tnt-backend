import { Elysia, t } from "elysia";
import { TripperController } from "../controllers/TripperController";
import { jwtConfig } from "../utils/jwt.config";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

const tripperController = new TripperController();

const tripperRoutes = new Elysia({ prefix: "/api/v1/trippers" })
  .use(jwtConfig)
  // Public routes don't need auth
  .get(
    "/posts",
    async ({ query }) => {
      return await tripperController.getAllPosts({ query } as any);
    },
    {
      query: t.Object({
        sort: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        page: t.Optional(t.String()),
        type: t.Optional(t.String()),
        location: t.Optional(t.String()),
        userId: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/posts/:id",
    async ({ params }) => {
      return await tripperController.getPostById({ params } as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Add an endpoint to serve uploaded files
  .get(
    "/files/:fileName",
    async ({ params }) => {
      try {
        const filePath = path.join("storage/trippers", params.fileName);

        if (!fs.existsSync(filePath)) {
          return new Response("File not found", { status: 404 });
        }

        const fileBuffer = await fs.promises.readFile(filePath);
        const fileExtension = path.extname(params.fileName).toLowerCase();

        let contentType = "application/octet-stream";
        if (fileExtension === ".jpg" || fileExtension === ".jpeg")
          contentType = "image/jpeg";
        else if (fileExtension === ".png") contentType = "image/png";
        else if (fileExtension === ".gif") contentType = "image/gif";
        else if (fileExtension === ".mp4") contentType = "video/mp4";

        return new Response(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000",
          },
        });
      } catch (error) {
        return new Response("Error serving file", { status: 500 });
      }
    },
    {
      params: t.Object({
        fileName: t.String(),
      }),
    }
  )
  // Protected routes with authentication
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

      // Safely extract the user ID from the JWT payload
      if (!data || typeof data !== "object") {
        throw new Error("Invalid token payload");
      }

      // Check for either id or sub in the token payload
      const userId = data.id || data.sub;

      if (!userId) {
        throw new Error("User ID not found in token");
      }

      return { userId };
    } catch (error) {
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
  // Create a new post (authenticated)
  .post(
    "/posts",
    async ({ body, userId }) => {
      // Pass the authenticated userId along with the body
      return await tripperController.createPost({ body, userId } as any);
    },
    {
      body: t.Object({
        caption: t.String(),
        userAvatar: t.String(),
        mediaUrl: t.String(),
        mediaType: t.Union([t.Literal("image"), t.Literal("video")]),
        location: t.String(),
      }),
    }
  )
  // Update post reactions (like/dislike - authenticated)
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
    }
  )
  // Add a comment to a post (authenticated)
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
        userAvatar: t.String(),
        text: t.String(),
      }),
    }
  )
  // Like a comment (authenticated)
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
    }
  )
  // Add a new endpoint for media upload
  .post(
    "/upload/media",
    async ({ body, userId, request }) => {
      // Handle the file upload
      try {
        // Create storage directory if it doesn't exist
        const baseDir = "storage/trippers";
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }

        // Generate a secure unique filename
        const fileExtension = body.file.name.split(".").pop() || "unknown";
        const uniqueId = crypto.randomUUID();
        const newFileName = `${uniqueId}.${fileExtension}`;
        const filePath = path.join(baseDir, newFileName);

        // Get the file content and write it to storage
        const fileContent = await body.file.arrayBuffer();
        await fs.promises.writeFile(filePath, new Uint8Array(fileContent));

        // Get the server domain from environment or request headers
        const apiUrl =
          process.env.API_URL ||
          `${
            request.headers.get("x-forwarded-proto") || "http"
          }://${request.headers.get("host")}`;

        // Generate the URL pointing to our file serving endpoint
        const fileUrl = `${apiUrl}/api/v1/trippers/files/${newFileName}`;

        return {
          status: true,
          message: "File uploaded successfully",
          url: fileUrl,
          fileName: newFileName,
          fileSize: body.file.size,
          fileType: body.file.type,
        };
      } catch (error) {
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
          format: ["image/jpeg", "image/png", "image/gif", "video/mp4"],
          maxSize: 10 * 1024 * 1024, // 10MB max size
        }),
      }),
    }
  )
  // Delete a post (authenticated + owner check)
  .delete(
    "/posts/:id",
    async ({ params, userId }) => {
      // Owner check is now implemented in the controller
      return await tripperController.deletePost({ params, userId } as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );

export default tripperRoutes;
