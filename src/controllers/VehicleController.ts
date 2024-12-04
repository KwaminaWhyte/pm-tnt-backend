import {
  VehicleInterface,
  CreateVehicleDTO,
  UpdateVehicleDTO,
  VehicleRatingDTO,
} from "../utils/types";
import Vehicle from "../models/Vehicle";

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
        throw new Error(
          JSON.stringify({
            status: "error",
            message: "Invalid pagination parameters",
            errors: [
              {
                type: "ValidationError",
                path: ["page", "limit"],
                message: "Page and limit must be positive numbers",
              },
            ],
          })
        );
      }

      const filter: Record<string, any> = {};

      if (searchTerm) {
        filter.$or = [
          { vehicleType: { $regex: searchTerm, $options: "i" } },
          { make: { $regex: searchTerm, $options: "i" } },
          { model: { $regex: searchTerm, $options: "i" } },
        ];
      }
      console.log(isAvailable);

      if (isAvailable !== undefined) {
        filter["availability.isAvailable"] = isAvailable;
      }

      if (priceRange) {
        filter.pricePerDay = {
          $gte: priceRange.min,
          $lte: priceRange.max,
        };
      }

      if (vehicleType) {
        filter.vehicleType = vehicleType;
      }

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

      const [vehicles, totalCount] = await Promise.all([
        Vehicle.find(filter)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort(sortOptions),
        Vehicle.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      if (page > totalPages && totalCount > 0) {
        throw new Error(
          JSON.stringify({
            status: "error",
            message: "Page number exceeds available pages",
            errors: [
              {
                type: "ValidationError",
                path: ["page"],
                message: `Page should be between 1 and ${totalPages}`,
              },
            ],
          })
        );
      }

      return {
        vehicles,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          status: "error",
          message: "Failed to retrieve vehicles",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            status: "error",
            message: "Vehicle not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Vehicle not found",
              },
            ],
          })
        );
      }

      return { vehicle };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          status: "error",
          message: "Failed to retrieve vehicle",
          errors: [
            {
              type: "ServerError",
              path: ["id"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
    }
  }

  /**
   * Create new vehicle
   * @throws {Error} 400 - Validation error
   */
  async createVehicle(data: CreateVehicleDTO) {
    try {
      const vehicle = new Vehicle({
        ...data,
        availability: {
          isAvailable: true,
          location: {
            city: data.city,
            country: data.country,
          },
        },
      });

      const savedVehicle = await vehicle.save();
      return {
        message: "Vehicle created successfully",
        vehicle: savedVehicle,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          status: "error",
          message: "Failed to create vehicle",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
    }
  }

  /**
   * Update vehicle
   * @throws {Error} 404 - Vehicle not found
   * @throws {Error} 400 - Validation error
   */
  async updateVehicle(id: string, data: UpdateVehicleDTO) {
    try {
      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        throw new Error(
          JSON.stringify({
            status: "error",
            message: "Vehicle not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Vehicle not found",
              },
            ],
          })
        );
      }

      const locationUpdate =
        data.city || data.country
          ? {
              "availability.location": {
                city: data.city || vehicle.availability.location.city,
                country: data.country || vehicle.availability.location.country,
              },
            }
          : {};

      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        id,
        {
          $set: {
            ...data,
            ...locationUpdate,
          },
        },
        { new: true }
      );

      return {
        message: "Vehicle updated successfully",
        vehicle: updatedVehicle,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          status: "error",
          message: "Failed to update vehicle",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            status: "error",
            message: "Vehicle not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Vehicle not found",
              },
            ],
          })
        );
      }

      return {
        message: "Vehicle deleted successfully",
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          status: "error",
          message: "Failed to delete vehicle",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            status: "error",
            message: "Vehicle not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Vehicle not found",
              },
            ],
          })
        );
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
    } catch (error) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          status: "error",
          message: "Failed to submit rating",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
        throw new Error(
          JSON.stringify({
            status: "error",
            message: "Vehicle not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Vehicle not found",
              },
            ],
          })
        );
      }

      // Check if dates are valid
      const startDate = new Date(params.startDate);
      const endDate = new Date(params.endDate);

      if (startDate >= endDate) {
        throw new Error(
          JSON.stringify({
            status: "error",
            message: "Invalid dates",
            errors: [
              {
                type: "ValidationError",
                path: ["dates"],
                message: "Start date must be before end date",
              },
            ],
          })
        );
      }

      // Check vehicle availability using the model method
      const isAvailable = vehicle.isAvailableForDates(startDate, endDate);

      if (!isAvailable) {
        return {
          status: "success",
          data: {
            isAvailable: false,
            message: "Vehicle is not available for the selected dates",
            maintenanceStatus: vehicle.maintenanceStatus,
          },
        };
      }

      // Calculate rental price
      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const priceDetails = vehicle.calculateRentalPrice(
        days,
        params.insuranceOption
      );

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
          maintenanceStatus: vehicle.maintenanceStatus,
        },
        rental: {
          startDate,
          endDate,
          days,
          ...priceDetails,
        },
      };
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("status")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          status: "error",
          message: "Failed to check vehicle availability",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
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
    } catch (error) {
      throw new Error(
        JSON.stringify({
          status: "error",
          message: "Failed to retrieve statistics",
          errors: [
            {
              type: "ServerError",
              path: ["server"],
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            },
          ],
        })
      );
    }
  }
}
