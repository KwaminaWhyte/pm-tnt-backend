import { Elysia, t } from "elysia";
import { jwtConfig } from "~/utils/jwt.config";
import VehicleController from "~/controllers/VehicleController";
import BookingController from "~/controllers/BookingController";

const vehicleController = new VehicleController();

const adminVehicleRoutes = new Elysia({ prefix: "/api/v1/vehicles/admin" })
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

  .get(
    "/",
    async ({ query }) => {
      // Log raw query parameters for debugging
      // console.log("Raw query parameters:", query);

      // Convert and parse parameters for controller
      const parsedQuery: Record<string, any> = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
        searchTerm: query.searchTerm || undefined,
      };

      // Handle capacity - must be numeric
      if (query.capacity) {
        parsedQuery.capacity = parseInt(query.capacity);
      }

      // Handle vehicle type
      if (query.vehicleType) {
        parsedQuery.vehicleType = query.vehicleType;
      }

      // Handle sorting options
      if (query.sortBy) {
        parsedQuery.sortBy = query.sortBy;
      }

      if (query.sortOrder) {
        parsedQuery.sortOrder = query.sortOrder;
      }

      // Handle price range - only include if it has meaningful values
      if (query.priceRange) {
        const { min, max } = query.priceRange;
        // Only add priceRange if min or max is greater than 0
        if (min > 0 || max > 0) {
          parsedQuery.priceRange = query.priceRange;
        }
      }

      // Handle location filters
      if (query.city) {
        parsedQuery.city = query.city;
      }

      if (query.country) {
        parsedQuery.country = query.country;
      }

      // Handle availability as a boolean - parse string representation
      if (query.isAvailable !== undefined) {
        // Convert string 'true'/'false' to boolean
        parsedQuery.isAvailable = query.isAvailable === "true";
        // console.log(
        //   "Parsed isAvailable:",
        //   parsedQuery.isAvailable,
        //   typeof parsedQuery.isAvailable
        // );
      }

      // Log parsed parameters for debugging
      // console.log("Parsed query parameters:", parsedQuery);

      return vehicleController.getVehicles(parsedQuery);
    },
    {
      detail: {
        summary: "Get all vehicles with pagination and filtering",
        tags: ["Vehicles - Public"],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        searchTerm: t.Optional(t.String()),
        isAvailable: t.Optional(t.String()), // Change to string since query params come as strings
        priceRange: t.Optional(
          t.Object({
            min: t.Number(),
            max: t.Number(),
          })
        ),
        vehicleType: t.Optional(t.String()),
        city: t.Optional(t.String()),
        country: t.Optional(t.String()),
        capacity: t.Optional(t.String()),
        sortBy: t.Optional(
          t.Union([
            t.Literal("pricePerDay"),
            t.Literal("capacity"),
            t.Literal("rating"),
          ])
        ),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
    }
  )

  .post(
    "/",
    async ({ body }) => {
      console.log("Create vehicle request body:", body);

      // Current date for default values
      const currentDate = new Date();
      const nextServiceDate = new Date();
      nextServiceDate.setMonth(nextServiceDate.getMonth() + 3); // Default next service in 3 months

      // Parse features and images if they're comma-separated strings
      const features = Array.isArray(body.features)
        ? body.features
        : typeof body.features === "string"
        ? body.features.split(",").map((f: string) => f.trim())
        : [];

      const images = Array.isArray(body.images)
        ? body.images
        : typeof body.images === "string"
        ? body.images.split(",").map((i: string) => i.trim())
        : [];

      // Adapt the body structure to match the CreateVehicleDTO interface
      const vehicleData = {
        vehicleType: body.vehicleType,
        make: body.make,
        model: body.model,
        year: body.year || new Date().getFullYear(),

        // Individual fields that will be structured in controller
        color: body.color || "Unknown",
        licensePlate: body.licensePlate || "",
        transmission: (body.transmission || "Automatic") as
          | "Automatic"
          | "Manual",
        fuelType: (body.fuelType || "Petrol") as
          | "Petrol"
          | "Diesel"
          | "Electric"
          | "Hybrid",
        mileage: body.mileage || 0,
        vin: body.vin || "",
        insuranceProvider: body.insuranceProvider || "",
        insurancePolicyNumber: body.insurancePolicyNumber || "",
        insuranceExpiryDate:
          body.insuranceExpiryDate ||
          new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)),
        insuranceCoverage: body.insuranceCoverage || "Basic",

        // Structured details object
        details: {
          color: body.color || "Unknown",
          licensePlate: body.licensePlate || "",
          transmission: (body.transmission || "Automatic") as
            | "Automatic"
            | "Manual",
          fuelType: (body.fuelType || "Petrol") as
            | "Petrol"
            | "Diesel"
            | "Electric"
            | "Hybrid",
          mileage: body.mileage || 0,
          vin: body.vin || "",
          insurance: {
            provider: body.insuranceProvider || "",
            policyNumber: body.insurancePolicyNumber || "",
            expiryDate:
              body.insuranceExpiryDate ||
              new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)),
            coverage: body.insuranceCoverage || "Basic",
          },
        },

        // Required maintenance data
        maintenance: {
          lastService: currentDate,
          nextService: nextServiceDate,
          status: "Available" as "Available" | "In Service" | "Repairs Needed",
          history: [],
        },

        features,
        capacity: body.capacity,
        pricePerDay: body.pricePerDay,

        // Location data for availability
        city: body.city,
        country: body.country,
        coordinates: body.coordinates || {
          latitude: 0,
          longitude: 0,
        },
        location: {
          city: body.city,
          country: body.country,
          coordinates: body.coordinates || {
            latitude: 0,
            longitude: 0,
          },
        },

        // Rental terms
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

        images,
        policies: body.policies || "",
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
