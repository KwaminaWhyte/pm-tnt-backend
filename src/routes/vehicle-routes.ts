import { Elysia, t } from "elysia";
import { jwtConfig } from "../utils/jwt.config";
import VehicleController from "../controllers/VehicleController";
import { isAdmin } from "../middleware/auth";

const vehicleController = new VehicleController();

const vehicleRoutes = new Elysia({ prefix: "/api/v1/vehicles" })
  // .use(jwtConfig)
  // .derive(async ({ headers, jwt_auth }) => {
  //   const auth = headers["authorization"];
  //   const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

  //   if (!token) {
  //     throw new Error(JSON.stringify({
  //       status: "error",
  //       message: "Unauthorized",
  //       errors: [{
  //         type: "AuthError",
  //         path: ["authorization"],
  //         message: "Token is missing"
  //       }]
  //     }));
  //   }

  //   try {
  //     const userId = await jwt_auth.verify(token);
  //     return { userId };
  //   } catch (error) {
  //     throw new Error(JSON.stringify({
  //       status: "error",
  //       message: "Unauthorized",
  //       errors: [{
  //         type: "AuthError",
  //         path: ["authorization"],
  //         message: "Invalid or expired token"
  //       }]
  //     }));
  //   }
  // })
  // .guard({
  //   detail: {
  //     description: "Require user to be logged in",
  //   },
  // })
  .group("/public", (app) =>
    app
      .get(
        "/",
        async ({ query }) => {
          const {
            page = 1,
            limit = 10,
            searchTerm,
            vehicleType,
            city,
            country,
            minPrice,
            maxPrice,
            capacity,
            isAvailable,
            sortBy,
            sortOrder,
          } = query;

          const priceRange =
            minPrice || maxPrice
              ? {
                  min: minPrice || 0,
                  max: maxPrice || Number.MAX_SAFE_INTEGER,
                }
              : undefined;

          return vehicleController.getVehicles({
            page,
            limit,
            searchTerm,
            vehicleType,
            city,
            country,
            capacity,
            isAvailable,
            priceRange,
            sortBy,
            sortOrder,
          });
        },
        {
          detail: {
            summary: "List all vehicles",
            tags: ["Vehicles - Public"],
          },
          query: t.Object({
            page: t.Optional(t.Number()),
            limit: t.Optional(t.Number()),
            searchTerm: t.Optional(t.String()),
            vehicleType: t.Optional(t.String()),
            city: t.Optional(t.String()),
            country: t.Optional(t.String()),
            minPrice: t.Optional(t.Number()),
            maxPrice: t.Optional(t.Number()),
            capacity: t.Optional(t.Number()),
            isAvailable: t.Optional(t.Boolean()),
            sortBy: t.Optional(
              t.Union([
                t.Literal("pricePerDay"),
                t.Literal("capacity"),
                t.Literal("rating"),
              ])
            ),
            sortOrder: t.Optional(
              t.Union([t.Literal("asc"), t.Literal("desc")])
            ),
          }),
        }
      )
      .get(
        "/:id",
        async ({ params: { id } }) => vehicleController.getVehicle(id),
        {
          detail: {
            summary: "Get vehicle details",
            tags: ["Vehicles - Public"],
          },
          params: t.Object({
            id: t.String(),
          }),
        }
      )
      .post(
        "/:id/rate",
        async ({ params: { id }, body, userId }) =>
          vehicleController.rateVehicle(id, body, userId),
        {
          detail: {
            summary: "Rate a vehicle",
            tags: ["Vehicles - Public"],
          },
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            rating: t.Number({ minimum: 1, maximum: 5 }),
            comment: t.Optional(t.String()),
          }),
        }
      )
  )
  .group("/admin", (app) =>
    app
      // .guard({
      //   beforeHandle: [isAdmin],
      // })
      .post("/", async ({ body }) => vehicleController.createVehicle(body), {
        detail: {
          summary: "Create a new vehicle",
          tags: ["Vehicles - Admin"],
        },
        body: t.Object({
          vehicleType: t.String(),
          make: t.String(),
          model: t.String(),
          year: t.Optional(t.Number()),
          features: t.Array(t.String()),
          capacity: t.Number(),
          pricePerDay: t.Number(),
          city: t.String(),
          country: t.String(),
          images: t.Array(t.String()),
          policies: t.Optional(t.String()),
        }),
      })
      .put(
        "/:id",
        async ({ params: { id }, body }) =>
          vehicleController.updateVehicle(id, body),
        {
          detail: {
            summary: "Update a vehicle",
            tags: ["Vehicles - Admin"],
          },
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            vehicleType: t.Optional(t.String()),
            make: t.Optional(t.String()),
            model: t.Optional(t.String()),
            year: t.Optional(t.Number()),
            features: t.Optional(t.Array(t.String())),
            capacity: t.Optional(t.Number()),
            pricePerDay: t.Optional(t.Number()),
            city: t.Optional(t.String()),
            country: t.Optional(t.String()),
            images: t.Optional(t.Array(t.String())),
            policies: t.Optional(t.String()),
            isAvailable: t.Optional(t.Boolean()),
          }),
        }
      )
      .delete(
        "/:id",
        async ({ params: { id } }) => vehicleController.deleteVehicle(id),
        {
          detail: {
            summary: "Delete a vehicle",
            tags: ["Vehicles - Admin"],
          },
          params: t.Object({
            id: t.String(),
          }),
        }
      )
      .get("/stats", async () => vehicleController.getVehicleStats(), {
        detail: {
          summary: "Get vehicle statistics",
          tags: ["Vehicles - Admin"],
        },
      })
  );

export default vehicleRoutes;
