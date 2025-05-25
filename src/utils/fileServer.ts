import Elysia from "elysia";
import fs from "fs";

const fileServer = new Elysia()
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
  });

export default fileServer;
