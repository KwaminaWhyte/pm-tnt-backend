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
      return { userId: data?.id };
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
      return await tripperController.createPost({ body, userId } as any);
    },
    {
      body: t.Object({
        userId: t.String(),
        userName: t.String(),
        userAvatar: t.String(),
        caption: t.String(),
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
        userId: t.String(),
        userName: t.String(),
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
    async ({ body, userId }) => {
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

        // Get the server domain from environment or use default
        const domain =
          process.env.STORAGE_DOMAIN || "https://storage.pmtnt.com";
        const fileUrl = `${domain}/${baseDir}/${newFileName}`;

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
      // Owner check would be implemented in controller
      return await tripperController.deletePost({ params, userId } as any);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );

export default tripperRoutes;
