import { Elysia, t } from "elysia";
import VehicleController from "~/controllers/VehicleController";
import BookingController from "~/controllers/BookingController";

const vehicleController = new VehicleController();

const adminVehicleRoutes = new Elysia({ prefix: "/admin" })
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
      const payload = data as Record<string, any>;

      const userId = payload.userId;

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
  .guard({
    detail: {
      description: "Require user to be logged in",
    },
  })

  .post(
    "/",
    async ({ body }: { body: any }) => {
      return vehicleController.createVehicle(body);
    },
    {
      detail: {
        summary: "Create a new vehicle",
        tags: ["Vehicles - Admin"],
      },
      body: t.Object({
        vehicleType: t.String(),
        make: t.String(),
        model: t.String(),
        year: t.Number(),
        features: t.Optional(t.Array(t.String())),
        capacity: t.Number(),
        pricePerDay: t.Number(),
        city: t.String(),
        country: t.String(),
        images: t.Optional(t.Array(t.String())),
        policies: t.Optional(t.String()),
        // Vehicle details
        color: t.Optional(t.String()),
        licensePlate: t.Optional(t.String()),
        transmission: t.Optional(t.String()),
        fuelType: t.Optional(t.String()),
        mileage: t.Optional(t.Number()),
        vin: t.Optional(t.String()),
        // Insurance fields
        insuranceProvider: t.Optional(t.String()),
        insurancePolicyNumber: t.Optional(t.String()),
        insuranceExpiryDate: t.Optional(t.String()),
        insuranceCoverage: t.Optional(t.String()),
        // Maintenance fields
        lastService: t.Optional(t.String()),
        nextService: t.Optional(t.String()),
        // Rental terms
        minimumAge: t.Optional(t.Number()),
        securityDeposit: t.Optional(t.Number()),
        mileageLimit: t.Optional(t.Number()),
        additionalDrivers: t.Optional(t.Boolean()),
        requiredDocuments: t.Optional(t.Array(t.String())),
      }),
    }
  )

  .put(
    "/:id",
    async ({ params: { id }, body }) => {
      // For update, we'll pass the data directly to the controller
      // The controller will handle the proper nested structure mapping
      const updateData: any = { ...body };

      // Handle availability status if present
      if (body.isAvailable !== undefined) {
        updateData["availability.isAvailable"] =
          typeof body.isAvailable === "string"
            ? body.isAvailable === "true"
            : !!body.isAvailable;

        delete updateData.isAvailable;
      }

      console.log("Processed update data:", updateData);
      return vehicleController.updateVehicle(id, updateData);
    },
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
        status: t.Optional(t.String()),
        color: t.Optional(t.String()),
        licensePlate: t.Optional(t.String()),
        // Vehicle details
        transmission: t.Optional(t.String()),
        fuelType: t.Optional(t.String()),
        mileage: t.Optional(t.Number()),
        vin: t.Optional(t.String()),
        // Insurance fields
        insuranceProvider: t.Optional(t.String()),
        insurancePolicyNumber: t.Optional(t.String()),
        insuranceExpiryDate: t.Optional(t.String()),
        insuranceCoverage: t.Optional(t.String()),
        // Maintenance fields
        lastService: t.Optional(t.String()),
        nextService: t.Optional(t.String()),
        // Rental terms
        minimumAge: t.Optional(t.Number()),
        securityDeposit: t.Optional(t.Number()),
        mileageLimit: t.Optional(t.Number()),
        additionalDrivers: t.Optional(t.Boolean()),
        requiredDocuments: t.Optional(t.Array(t.String())),
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
  });

export default adminVehicleRoutes;
