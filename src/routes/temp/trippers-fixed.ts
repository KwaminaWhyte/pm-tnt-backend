import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { TripperController } from "../../controllers/TripperController";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

export default (app: Elysia) => {
  const tripperController = new TripperController();

  return app
    .use(
      jwt({
        name: "jwt",
        secret: process.env.JWT_SECRET || "random_secret",
      })
    )
    .group("/api/v1/trippers", (app) => {
      return (
        app
          // Get all posts with optional filters (public)
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

          // Get a specific post by ID (public)
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

          // Create a new post (authenticated)
          .post(
            "/posts",
            async ({ body, jwt, set }) => {
              // Verify the JWT token
              const token = await jwt.verify();
              if (!token) {
                set.status = 401;
                return {
                  status: false,
                  message: "Unauthorized. Please login.",
                };
              }

              return await tripperController.createPost({ body } as any);
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
            async ({ params, body, jwt, set }) => {
              // Verify the JWT token
              const token = await jwt.verify();
              if (!token) {
                set.status = 401;
                return {
                  status: false,
                  message: "Unauthorized. Please login.",
                };
              }

              return await tripperController.updateReactions({
                params,
                body,
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
            async ({ params, body, jwt, set }) => {
              // Verify the JWT token
              const token = await jwt.verify();
              if (!token) {
                set.status = 401;
                return {
                  status: false,
                  message: "Unauthorized. Please login.",
                };
              }

              return await tripperController.addComment({
                params,
                body,
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
            async ({ params, jwt, set }) => {
              // Verify the JWT token
              const token = await jwt.verify();
              if (!token) {
                set.status = 401;
                return {
                  status: false,
                  message: "Unauthorized. Please login.",
                };
              }

              return await tripperController.likeComment({ params } as any);
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
            async ({ body, jwt, set }) => {
              // Verify the JWT token
              const token = await jwt.verify();
              if (!token) {
                set.status = 401;
                return {
                  status: false,
                  message: "Unauthorized. Please login.",
                };
              }

              // Handle the file upload
              try {
                // Create storage directory if it doesn't exist
                const baseDir = "storage/trippers";
                if (!fs.existsSync(baseDir)) {
                  fs.mkdirSync(baseDir, { recursive: true });
                }

                // Generate a secure unique filename
                const fileExtension =
                  body.file.name.split(".").pop() || "unknown";
                const uniqueId = crypto.randomUUID();
                const newFileName = `${uniqueId}.${fileExtension}`;
                const filePath = path.join(baseDir, newFileName);

                // Get the file content and write it to storage
                const fileContent = await body.file.arrayBuffer();
                await fs.promises.writeFile(filePath, Buffer.from(fileContent));

                // Get the server domain from environment or use default
                const domain =
                  process.env.STORAGE_DOMAIN || "https://storage.pmtnt.com";
                const fileUrl = `${domain}/trippers/${newFileName}`;

                return {
                  status: true,
                  message: "File uploaded successfully",
                  url: fileUrl,
                  fileName: newFileName,
                  fileSize: body.file.size,
                  fileType: body.file.type,
                };
              } catch (error) {
                set.status = 500;
                return {
                  status: false,
                  message: "Failed to upload file",
                  error:
                    error instanceof Error ? error.message : "Unknown error",
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
              type: "multipart/form-data",
              tags: ["Trippers"],
            }
          )

          // Delete a post (authenticated + owner check)
          .delete(
            "/posts/:id",
            async ({ params, jwt, set }) => {
              // Verify the JWT token
              const token = await jwt.verify();
              if (!token) {
                set.status = 401;
                return {
                  status: false,
                  message: "Unauthorized. Please login.",
                };
              }

              // Owner check would be implemented in controller
              return await tripperController.deletePost({ params } as any);
            },
            {
              params: t.Object({
                id: t.String(),
              }),
            }
          )
      );
    });
};
