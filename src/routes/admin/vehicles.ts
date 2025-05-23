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
      if (!data || typeof data === "boolean") {
        throw new Error("Invalid token data");
      }
      return { userId: data.id as string };
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
      console.log("Create vehicle request body:", body);

      // Current date for default values
      const currentDate = new Date();
      const nextServiceDate = new Date();
      nextServiceDate.setMonth(nextServiceDate.getMonth() + 3); // Default next service in 3 months

      // Parse features and images if they're comma-separated strings
      const features = Array.isArray(body.features)
        ? body.features
        : typeof body.features === "string"
        ? body.features
            .split(",")
            .map((f: string) => f.trim())
            .filter(Boolean)
        : [];

      const images = Array.isArray(body.images)
        ? body.images
        : typeof body.images === "string"
        ? body.images
            .split(",")
            .map((i: string) => i.trim())
            .filter(Boolean)
        : [];

      // Adapt the body structure to match the CreateVehicleDTO interface
      const vehicleData: any = {
        vehicleType: body.vehicleType,
        make: body.make,
        model: body.model,
        year: body.year || new Date().getFullYear(),
        capacity: body.capacity,
        pricePerDay: body.pricePerDay,
        features,
        images,
        policies: body.policies || "Standard rental policies apply.",
        details: {
          vin: body.vin || "TBD",
          licensePlate: body.licensePlate || "TBD",
          color: body.color || "Unknown",
          transmission: body.transmission || "Automatic",
          fuelType: body.fuelType || "Petrol",
          mileage: body.mileage || 0,
          insurance: {
            provider: body.insuranceProvider || "TBD",
            policyNumber: body.insurancePolicyNumber || "TBD",
            expiryDate:
              body.insuranceExpiryDate ||
              new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            coverage: body.insuranceCoverage || "Basic",
          },
        },
        maintenance: {
          lastService: body.lastService || new Date(),
          nextService:
            body.nextService ||
            (() => {
              const d = new Date();
              d.setMonth(d.getMonth() + 3);
              return d;
            })(),
          status: "Available",
          history: [],
        },
        location: {
          city: body.city,
          country: body.country,
          coordinates: body.coordinates || { latitude: 0, longitude: 0 },
        },
        rentalTerms: {
          minimumAge: body.minimumAge || 18,
          requiredDocuments: body.requiredDocuments || [
            "Driver's License",
            "Credit Card",
          ],
          securityDeposit: body.securityDeposit || 0,
          mileageLimit: body.mileageLimit || 0,
          additionalDrivers: body.additionalDrivers || false,
          insuranceOptions: body.insuranceOptions || [
            {
              type: "Basic",
              coverage: "Collision Damage Waiver",
              pricePerDay: 10,
            },
          ],
        },
      };

      console.log("Processed vehicle data:", vehicleData);
      return vehicleController.createVehicle(vehicleData);
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
        year: t.Optional(t.Number()),
        features: t.Array(t.String()),
        capacity: t.Number(),
        pricePerDay: t.Number(),
        city: t.String(),
        country: t.String(),
        images: t.Array(t.String()),
        policies: t.Optional(t.String()),
        color: t.Optional(t.String()),
        licensePlate: t.Optional(t.String()),
        transmission: t.Optional(t.String()),
        fuelType: t.Optional(t.String()),
        mileage: t.Optional(t.Number()),
        vin: t.Optional(t.String()),
        insuranceProvider: t.Optional(t.String()),
        insurancePolicyNumber: t.Optional(t.String()),
        insuranceExpiryDate: t.Optional(t.String()),
        insuranceCoverage: t.Optional(t.String()),
        minimumAge: t.Optional(t.Number()),
        requiredDocuments: t.Optional(t.Array(t.String())),
        securityDeposit: t.Optional(t.Number()),
        mileageLimit: t.Optional(t.Number()),
        additionalDrivers: t.Optional(t.Boolean()),
        insuranceOptions: t.Optional(
          t.Array(
            t.Object({
              type: t.String(),
              coverage: t.String(),
              pricePerDay: t.Number(),
            })
          )
        ),
        coordinates: t.Optional(
          t.Object({
            latitude: t.Number(),
            longitude: t.Number(),
          })
        ),
      }),
    }
  )

  .put(
    "/:id",
    async ({ params: { id }, body }) => {
      console.log(`Update vehicle ${id} request:`, body);

      // For update, we'll structure data to match the expected format
      const updateData: any = { ...body };

      // Handle location data correctly
      if (body.city || body.country) {
        updateData.location = {
          city: body.city,
          country: body.country,
        };
        // Remove individual properties to avoid conflicts
        delete updateData.city;
        delete updateData.country;
      }

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
