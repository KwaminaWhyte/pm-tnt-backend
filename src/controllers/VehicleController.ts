import {
  VehicleInterface,
  CreateVehicleDTO,
  UpdateVehicleDTO,
  VehicleRatingDTO,
} from "~/utils/types";
import Vehicle from "~/models/Vehicle";
import { error } from "elysia";

export default class VehicleController {
  /**
   * Retrieve all vehicles with pagination and filtering
   * @throws {Error} 400 - Invalid search parameters
   */
  async getVehicles({
    page = 1,
    searchTerm,
    limit = 10,
    isAvailable,
    priceRange,
    vehicleType,
    city,
    country,
    capacity,
    sortBy,
    sortOrder,
  }: {
    page?: number;
    searchTerm?: string;
    limit?: number;
    isAvailable?: boolean;
    priceRange?: { min: number; max: number };
    vehicleType?: string;
    city?: string;
    country?: string;
    capacity?: number;
    sortBy?: "pricePerDay" | "capacity" | "rating";
    sortOrder?: "asc" | "desc";
  }) {
    try {
      if (page < 1 || limit < 1) {
        return error(400, {
          message: "Invalid pagination parameters",
          errors: [
            {
              type: "ValidationError",
              path: ["page", "limit"],
              message: "Page and limit must be positive numbers",
            },
          ],
        });
      }

      // Create filter object
      const filter: Record<string, any> = {};

      if (searchTerm) {
        filter.$or = [
          { vehicleType: { $regex: searchTerm, $options: "i" } },
          { make: { $regex: searchTerm, $options: "i" } },
          { model: { $regex: searchTerm, $options: "i" } },
        ];
      }

      // Debug: Log isAvailable value
      console.log(
        "isAvailable parameter:",
        isAvailable,
        "type:",
        typeof isAvailable
      );

      // Handle boolean conversion
      if (isAvailable !== undefined) {
        // Fix: Convert string 'true'/'false' to boolean if needed
        const boolValue =
          typeof isAvailable === "string"
            ? isAvailable === "true"
            : !!isAvailable;

        filter["availability.isAvailable"] = boolValue;
      }

      if (priceRange) {
        // Only apply price filter if min and max are not both 0
        // This prevents filtering out all vehicles with default empty priceRange
        const hasValidPriceRange = priceRange.min > 0 || priceRange.max > 0;

        if (hasValidPriceRange) {
          filter.pricePerDay = {
            $gte: priceRange.min,
            $lte: priceRange.max > 0 ? priceRange.max : Number.MAX_SAFE_INTEGER,
          };
        }
      }

      if (vehicleType) {
        filter.vehicleType = vehicleType;
      }

      // City and country should map to availability.location
      if (city) {
        filter["availability.location.city"] = city;
      }

      if (country) {
        filter["availability.location.country"] = country;
      }

      if (capacity) {
        filter.capacity = { $gte: capacity };
      }

      const sortOptions: Record<string, 1 | -1> = {};
      if (sortBy) {
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.createdAt = -1;
      }

      // Debug: Log the filter and sort options
      console.log("MongoDB filter:", JSON.stringify(filter, null, 2));
      console.log("MongoDB sort options:", sortOptions);

      // Temporary workaround: Get all vehicles first without filter to debug
      const allVehicles = await Vehicle.find({}).lean();
      console.log(
        `Debug: Total vehicles in DB without filter: ${allVehicles.length}`
      );

      // If filter is empty (no search criteria), use empty object for find()
      const filterToUse = Object.keys(filter).length > 0 ? filter : {};

      const [vehicles, totalCount] = await Promise.all([
        Vehicle.find(filterToUse)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort(sortOptions),
        Vehicle.countDocuments(filterToUse),
      ]);

      console.log(
        `Vehicles found with filter: ${vehicles.length} out of ${totalCount} total`
      );

      const totalPages = Math.ceil(totalCount / limit);

      if (page > totalPages && totalCount > 0) {
        return error(400, {
          message: "Page number exceeds available pages",
          errors: [
            {
              type: "ValidationError",
              path: ["page"],
              message: `Page should be between 1 and ${totalPages}`,
            },
          ],
        });
      }

      return {
        success: true,
        data: vehicles,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("status")) {
        throw err;
      }
      console.error("Error in getVehicles:", err);
      return error(500, {
        message: "Failed to retrieve vehicles",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Get vehicle by ID
   * @throws {Error} 404 - Vehicle not found
   */
  async getVehicle(id: string) {
    try {
      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return error(404, {
          message: "Vehicle not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Vehicle not found",
            },
          ],
        });
      }

      return { vehicle };
    } catch (err) {
      if (err instanceof Error && err.message.includes("status")) {
        throw err;
      }
      return error(500, {
        message: "Failed to retrieve vehicle",
        errors: [
          {
            type: "ServerError",
            path: ["id"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Create new vehicle
   * @throws {Error} 400 - Validation error
   */
  async createVehicle(data: CreateVehicleDTO) {
    try {
      // Log incoming data for debugging
      console.log(
        "Create vehicle data received:",
        JSON.stringify(data, null, 2)
      );

      // No need to restructure the data as it's already properly structured from the form
      // Just create the vehicle directly with the data
      const vehicle = new Vehicle(data);

      const savedVehicle = await vehicle.save();
      return {
        message: "Vehicle created successfully",
        vehicle: savedVehicle,
      };
    } catch (err) {
      console.log(err);

      if (err instanceof Error && err.message.includes("status")) {
        throw err;
      }
      return error(500, {
        message: "Failed to create vehicle",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Update vehicle
   * @throws {Error} 404 - Vehicle not found
   * @throws {Error} 400 - Validation error
   */
  async updateVehicle(id: string, data: UpdateVehicleDTO) {
    try {
      // Log incoming update data for debugging
      console.log(
        "Update vehicle data received:",
        JSON.stringify(data, null, 2)
      );

      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return error(404, {
          message: "Vehicle not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Vehicle not found",
            },
          ],
        });
      }

      // Prepare update data with proper structure
      const updateData: Record<string, any> = {};

      // Basic information
      if (data.make) updateData.make = data.make;
      if (data.model) updateData.model = data.model;
      if (data.year) updateData.year = data.year;
      if (data.vehicleType) updateData.vehicleType = data.vehicleType;
      if (data.capacity) updateData.capacity = data.capacity;
      if (data.pricePerDay) updateData.pricePerDay = data.pricePerDay;
      if (data.features) updateData.features = data.features;
      if (data.images) updateData.images = data.images;
      if (data.policies) updateData.policies = data.policies;

      // Location data - update properly in the nested structure
      if (data.city) updateData["availability.location.city"] = data.city;
      if (data.country)
        updateData["availability.location.country"] = data.country;

      // Details data
      if (data.licensePlate)
        updateData["details.licensePlate"] = data.licensePlate;
      if (data.color) updateData["details.color"] = data.color;
      if (data.transmission)
        updateData["details.transmission"] = data.transmission;
      if (data.fuelType) updateData["details.fuelType"] = data.fuelType;
      if (data.mileage) updateData["details.mileage"] = data.mileage;
      if (data.vin) updateData["details.vin"] = data.vin;

      // Insurance data
      if (data.insuranceProvider)
        updateData["details.insurance.provider"] = data.insuranceProvider;
      if (data.insurancePolicyNumber)
        updateData["details.insurance.policyNumber"] =
          data.insurancePolicyNumber;
      if (data.insuranceExpiryDate)
        updateData["details.insurance.expiryDate"] = new Date(
          data.insuranceExpiryDate
        );
      if (data.insuranceCoverage)
        updateData["details.insurance.coverage"] = data.insuranceCoverage;

      // Maintenance data
      if (data.lastService)
        updateData["maintenance.lastService"] = new Date(data.lastService);
      if (data.nextService)
        updateData["maintenance.nextService"] = new Date(data.nextService);

      // Rental terms
      if (data.minimumAge)
        updateData["rentalTerms.minimumAge"] = data.minimumAge;
      if (data.securityDeposit)
        updateData["rentalTerms.securityDeposit"] = data.securityDeposit;
      if (data.mileageLimit)
        updateData["rentalTerms.mileageLimit"] = data.mileageLimit;
      if (data.additionalDrivers !== undefined)
        updateData["rentalTerms.additionalDrivers"] = data.additionalDrivers;
      if (data.requiredDocuments)
        updateData["rentalTerms.requiredDocuments"] = data.requiredDocuments;

      console.log(
        "Processed update data:",
        JSON.stringify(updateData, null, 2)
      );

      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );

      return {
        message: "Vehicle updated successfully",
        vehicle: updatedVehicle,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("status")) {
        throw err;
      }
      return error(500, {
        message: "Failed to update vehicle",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Delete vehicle
   * @throws {Error} 404 - Vehicle not found
   */
  async deleteVehicle(id: string) {
    try {
      const vehicle = await Vehicle.findByIdAndDelete(id);

      if (!vehicle) {
        return error(404, {
          message: "Vehicle not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Vehicle not found",
            },
          ],
        });
      }

      return {
        message: "Vehicle deleted successfully",
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("status")) {
        throw err;
      }
      return error(500, {
        message: "Failed to delete vehicle",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Rate vehicle
   * @throws {Error} 404 - Vehicle not found
   * @throws {Error} 400 - Invalid rating
   */
  async rateVehicle(id: string, data: VehicleRatingDTO, userId: string) {
    try {
      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return error(404, {
          message: "Vehicle not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Vehicle not found",
            },
          ],
        });
      }

      const existingRatingIndex = vehicle.ratings?.findIndex(
        (r) => r.userId.toString() === userId
      );

      if (existingRatingIndex !== undefined && existingRatingIndex >= 0) {
        if (!vehicle.ratings) vehicle.ratings = [];
        vehicle.ratings[existingRatingIndex] = {
          userId,
          rating: data.rating,
          comment: data.comment,
          createdAt: new Date(),
        };
      } else {
        if (!vehicle.ratings) vehicle.ratings = [];
        vehicle.ratings.push({
          userId,
          rating: data.rating,
          comment: data.comment,
          createdAt: new Date(),
        });
      }

      await vehicle.save();

      return {
        message: "Rating submitted successfully",
        vehicle,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("status")) {
        throw err;
      }
      return error(500, {
        message: "Failed to submit rating",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Check vehicle availability for specific dates
   * @throws {Error} 404 - Vehicle not found
   */
  async checkAvailability(
    id: string,
    params: {
      startDate: Date;
      endDate: Date;
      insuranceOption?: string;
    }
  ) {
    try {
      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return error(404, {
          message: "Vehicle not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Vehicle not found",
            },
          ],
        });
      }

      // Check if dates are valid
      const startDate = new Date(params.startDate);
      const endDate = new Date(params.endDate);

      if (startDate >= endDate) {
        return error(400, {
          message: "Invalid dates",
          errors: [
            {
              type: "ValidationError",
              path: ["dates"],
              message: "Start date must be before end date",
            },
          ],
        });
      }

      // Check vehicle availability - safely access methods
      // Use a simpler check since isAvailableForDates might not exist
      const isAvailable =
        vehicle.availability?.isAvailable === true &&
        vehicle.maintenance?.status === "Available" &&
        (!vehicle.maintenance?.nextService ||
          vehicle.maintenance.nextService > endDate);

      if (!isAvailable) {
        return {
          status: "success",
          data: {
            isAvailable: false,
            message: "Vehicle is not available for the selected dates",
            // Use safe access for maintenanceStatus
            maintenanceStatus: vehicle.maintenance?.status || "Unknown",
          },
        };
      }

      // Calculate rental price manually since calculateRentalPrice might not exist
      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate pricing
      const basePrice = vehicle.pricePerDay * days;
      let insuranceCost = 0;

      if (params.insuranceOption) {
        const insuranceOption = vehicle.rentalTerms.insuranceOptions?.find(
          (option) => option.type === params.insuranceOption
        );

        if (insuranceOption) {
          insuranceCost = insuranceOption.pricePerDay * days;
        }
      }

      const priceDetails = {
        basePrice,
        insuranceCost,
        totalPrice: basePrice + insuranceCost,
      };

      return {
        isAvailable: true,
        vehicle: {
          _id: vehicle._id,
          make: vehicle.make,
          model: vehicle.model,
          vehicleType: vehicle.vehicleType,
          capacity: vehicle.capacity,
          features: vehicle.features,
          location: vehicle.availability.location,
          // Safe access to maintenance status
          maintenanceStatus: vehicle.maintenance?.status || "Unknown",
        },
        rental: {
          startDate,
          endDate,
          days,
          ...priceDetails,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("status")) {
        throw err;
      }
      return error(500, {
        message: "Failed to check vehicle availability",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Get vehicle statistics
   */
  async getVehicleStats() {
    try {
      const [
        totalVehicles,
        availableVehicles,
        totalRatings,
        averageRating,
        vehiclesByType,
        vehiclesByLocation,
      ] = await Promise.all([
        Vehicle.countDocuments(),
        Vehicle.countDocuments({ "availability.isAvailable": true }),
        Vehicle.aggregate([
          { $unwind: "$ratings" },
          { $group: { _id: null, count: { $sum: 1 } } },
        ]),
        Vehicle.aggregate([
          { $unwind: "$ratings" },
          { $group: { _id: null, avgRating: { $avg: "$ratings.rating" } } },
        ]),
        Vehicle.aggregate([
          { $group: { _id: "$vehicleType", count: { $sum: 1 } } },
        ]),
        Vehicle.aggregate([
          {
            $group: {
              _id: {
                city: "$availability.location.city",
                country: "$availability.location.country",
              },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      return {
        totalVehicles,
        availableVehicles,
        totalRatings: totalRatings[0]?.count || 0,
        averageRating: averageRating[0]?.avgRating || 0,
        vehiclesByType: vehiclesByType.reduce(
          (acc, curr) => ({
            ...acc,
            [curr._id]: curr.count,
          }),
          {}
        ),
        vehiclesByLocation: vehiclesByLocation.reduce(
          (acc, curr) => ({
            ...acc,
            [`${curr._id.city}, ${curr._id.country}`]: curr.count,
          }),
          {}
        ),
      };
    } catch (err) {
      return error(500, {
        message: "Failed to retrieve statistics",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }
}
