import { error } from "elysia";
import Destination from "../models/Destination";
import { DestinationInterface } from "../utils/types";

export default class DestinationController {
  /**
   * Retrieve all destinations with pagination and filtering
   */
  async getDestinations({
    page = 1,
    limit = 10,
    searchTerm,
    country,
    city,
    climate,
    minPrice,
    maxPrice,
    sortBy = "createdAt",
    sortOrder = "desc",
    nearLocation,
  }: {
    page?: number;
    limit?: number;
    searchTerm?: string;
    country?: string;
    city?: string;
    climate?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    nearLocation?: {
      longitude: number;
      latitude: number;
      maxDistance: number;
    };
  }) {
    try {
      if (page < 1 || limit < 1 || limit > 100) {
        return error(400, {
          message: "Invalid pagination parameters",
          errors: [
            {
              type: "ValidationError",
              path: ["page", "limit"],
              message: "Page must be >= 1 and limit must be between 1 and 100",
            },
          ],
        });
      }

      const filter: Record<string, any> = { isActive: true };

      // Text search
      if (searchTerm) {
        filter.$or = [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { country: { $regex: searchTerm, $options: "i" } },
          { city: { $regex: searchTerm, $options: "i" } },
        ];
      }

      // Location filters
      if (country) filter.country = { $regex: country, $options: "i" };
      if (city) filter.city = { $regex: city, $options: "i" };
      if (climate) filter.climate = climate;

      // Price range filter
      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice !== undefined) filter.price.$gte = minPrice;
        if (maxPrice !== undefined) filter.price.$lte = maxPrice;
      }

      // Geospatial search
      if (nearLocation) {
        filter.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [nearLocation.longitude, nearLocation.latitude],
            },
            $maxDistance: nearLocation.maxDistance * 1000, // Convert km to meters
          },
        };
      }

      const sort: Record<string, 1 | -1> = {};
      if (sortBy) {
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;
      }

      const skipCount = (page - 1) * limit;
      const [destinations, totalCount] = await Promise.all([
        Destination.find(filter).sort(sort).skip(skipCount).limit(limit),
        Destination.countDocuments(filter),
      ]);

      return {
        success: true,
        data: destinations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (err: any) {
      console.error("Error fetching destinations:", err);
      return error(500, {
        message: "Failed to fetch destinations",
        errors: [
          {
            type: "ServerError",
            path: [],
            message: err.message,
          },
        ],
      });
    }
  }

  /**
   * Get destination by ID
   */
  async getDestination(id: string) {
    try {
      const destination = await Destination.findOne({ _id: id, isActive: true });

      if (!destination) {
        return error(404, {
          message: "Destination not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Destination with the specified ID does not exist",
            },
          ],
        });
      }

      return {
        success: true,
        data: destination,
      };
    } catch (err: any) {
      console.error("Error fetching destination:", err);
      return error(500, {
        message: "Failed to fetch destination",
        errors: [
          {
            type: "ServerError",
            path: [],
            message: err.message,
          },
        ],
      });
    }
  }

  /**
   * Create a new destination
   */
  async createDestination(destinationData: Partial<DestinationInterface>) {
    try {
      // Check if destination with same name exists
      const existingDestination = await Destination.findOne({
        name: destinationData.name,
      });

      if (existingDestination) {
        return error(400, {
          message: "Destination already exists",
          errors: [
            {
              type: "ValidationError",
              path: ["name"],
              message: "A destination with this name already exists",
            },
          ],
        });
      }

      // Validate best time to visit
      if (
        destinationData.bestTimeToVisit &&
        destinationData.bestTimeToVisit.startMonth > destinationData.bestTimeToVisit.endMonth
      ) {
        return error(400, {
          message: "Invalid best time to visit",
          errors: [
            {
              type: "ValidationError",
              path: ["bestTimeToVisit"],
              message: "Start month must be before or equal to end month",
            },
          ],
        });
      }

      const destination = new Destination(destinationData);
      await destination.save();

      return {
        success: true,
        data: destination,
      };
    } catch (err: any) {
      if (err.name === "ValidationError") {
        return error(400, {
          message: "Validation failed",
          errors: Object.keys(err.errors).map((key) => ({
            type: "ValidationError",
            path: [key],
            message: err.errors[key].message,
          })),
        });
      }

      console.error("Error creating destination:", err);
      return error(500, {
        message: "Failed to create destination",
        errors: [
          {
            type: "ServerError",
            path: [],
            message: err.message,
          },
        ],
      });
    }
  }

  /**
   * Update destination by ID
   */
  async updateDestination(id: string, updateData: Partial<DestinationInterface>) {
    try {
      // Check if destination exists
      const existingDestination = await Destination.findById(id);
      if (!existingDestination) {
        return error(404, {
          message: "Destination not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Destination with the specified ID does not exist",
            },
          ],
        });
      }

      // Check name uniqueness if name is being updated
      if (updateData.name && updateData.name !== existingDestination.name) {
        const duplicateName = await Destination.findOne({
          name: updateData.name,
          _id: { $ne: id },
        });

        if (duplicateName) {
          return error(400, {
            message: "Destination name already exists",
            errors: [
              {
                type: "ValidationError",
                path: ["name"],
                message: "A destination with this name already exists",
              },
            ],
          });
        }
      }

      // Validate best time to visit if being updated
      if (updateData.bestTimeToVisit) {
        const startMonth = updateData.bestTimeToVisit.startMonth ?? existingDestination.bestTimeToVisit.startMonth;
        const endMonth = updateData.bestTimeToVisit.endMonth ?? existingDestination.bestTimeToVisit.endMonth;

        if (startMonth > endMonth) {
          return error(400, {
            message: "Invalid best time to visit",
            errors: [
              {
                type: "ValidationError",
                path: ["bestTimeToVisit"],
                message: "Start month must be before or equal to end month",
              },
            ],
          });
        }
      }

      const updatedDestination = await Destination.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return {
        success: true,
        data: updatedDestination,
      };
    } catch (err: any) {
      if (err.name === "ValidationError") {
        return error(400, {
          message: "Validation failed",
          errors: Object.keys(err.errors).map((key) => ({
            type: "ValidationError",
            path: [key],
            message: err.errors[key].message,
          })),
        });
      }

      console.error("Error updating destination:", err);
      return error(500, {
        message: "Failed to update destination",
        errors: [
          {
            type: "ServerError",
            path: [],
            message: err.message,
          },
        ],
      });
    }
  }

  /**
   * Delete destination by ID
   */
  async deleteDestination(id: string) {
    try {
      const destination = await Destination.findById(id);

      if (!destination) {
        return error(404, {
          message: "Destination not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Destination with the specified ID does not exist",
            },
          ],
        });
      }

      // Soft delete by setting isActive to false
      destination.isActive = false;
      await destination.save();

      return {
        success: true,
        message: "Destination deleted successfully",
      };
    } catch (err: any) {
      console.error("Error deleting destination:", err);
      return error(500, {
        message: "Failed to delete destination",
        errors: [
          {
            type: "ServerError",
            path: [],
            message: err.message,
          },
        ],
      });
    }
  }
}
