import { error } from "elysia";
import Package from "../models/Package";
import { PackageInterface } from "../utils/types";

export default class PackageController {
  /**
   * Retrieve all packages with pagination and filtering
   * @throws {Error} 400 - Invalid search parameters
   */
  async getPackages({
    page = 1,
    searchTerm,
    limit = 10,
    sortBy,
    sortOrder,
  }: {
    page?: number;
    searchTerm?: string;
    limit?: number;
    sortBy?: "price" | "rating";
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

      const filter: Record<string, any> = {};

      if (searchTerm) {
        filter.$or = [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ];
      }

      const sort: Record<string, 1 | -1> = {};
      if (sortBy) {
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sort.createdAt = -1;
      }

      const skipCount = (page - 1) * limit;
      const [packages, totalCount] = await Promise.all([
        Package.find(filter).sort(sort).skip(skipCount).limit(limit),
        Package.countDocuments(filter),
      ]);

      return {
        success: true,
        data: packages,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (err: any) {
      return error(500, {
        message: "Failed to fetch packages",
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
   * Get package by ID
   * @throws {Error} 404 - Package not found
   */
  async getPackageById(id: string) {
    try {
      const packageItem = await Package.findById(id);
      if (!packageItem) {
        return error(404, {
          message: "Package not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Package with the specified ID does not exist",
            },
          ],
        });
      }

      return {
        success: true,
        data: packageItem,
      };
    } catch (err: any) {
      return error(500, {
        message: "Failed to fetch package",
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
   * Create a new package
   * @throws {Error} 400 - Invalid package data
   */
  async createPackage(packageData: Partial<PackageInterface>) {
    try {
      const packageItem = new Package(packageData);
      await packageItem.save();

      return {
        success: true,
        data: packageItem,
      };
    } catch (err: any) {
      return error(400, {
        message: "Failed to create package",
        errors: [
          {
            type: "ValidationError",
            path: [],
            message: err.message,
          },
        ],
      });
    }
  }

  /**
   * Update package by ID
   * @throws {Error} 404 - Package not found
   * @throws {Error} 400 - Invalid update data
   */
  async updatePackage(id: string, updateData: Partial<PackageInterface>) {
    try {
      const packageItem = await Package.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!packageItem) {
        return error(404, {
          message: "Package not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Package with the specified ID does not exist",
            },
          ],
        });
      }

      return {
        success: true,
        data: packageItem,
      };
    } catch (err: any) {
      return error(400, {
        message: "Failed to update package",
        errors: [
          {
            type: "ValidationError",
            path: [],
            message: err.message,
          },
        ],
      });
    }
  }

  /**
   * Delete package by ID
   * @throws {Error} 404 - Package not found
   */
  async deletePackage(id: string) {
    try {
      const packageItem = await Package.findByIdAndDelete(id);

      if (!packageItem) {
        return error(404, {
          message: "Package not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Package with the specified ID does not exist",
            },
          ],
        });
      }

      return {
        success: true,
        message: "Package deleted successfully",
      };
    } catch (err: any) {
      return error(500, {
        message: "Failed to delete package",
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
   * Create a customized version of an existing package
   * @throws {Error} 404 - Package not found
   * @throws {Error} 400 - Invalid customization data
   */
  async customizePackage(
    packageId: string,
    customizations: {
      accommodations?: string[];
      transportation?: "Flight" | "Train" | "Bus" | "Private Car" | "None";
      activities?: string[];
      meals?: {
        breakfast?: boolean;
        lunch?: boolean;
        dinner?: boolean;
      };
      itinerary?: Array<{
        day: number;
        title: string;
        description: string;
        activities?: string[];
      }>;
    }
  ) {
    try {
      const originalPackage = await Package.findById(packageId);

      if (!originalPackage) {
        return error(404, {
          message: "Package not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["packageId"],
              message: "Package with the specified ID does not exist",
            },
          ],
        });
      }

      // Create a new customized package based on the original
      const customizedPackage = {
        name: `${originalPackage.name} (Customized)`,
        price: originalPackage.price,
        description: originalPackage.description,
        images: originalPackage.images,
        videos: originalPackage.videos,
        duration: originalPackage.duration,
        // Merge original and custom accommodations, removing duplicates
        accommodations: customizations.accommodations || originalPackage.accommodations,
        // Use custom transportation or keep original
        transportation: customizations.transportation || originalPackage.transportation,
        // Merge original and custom activities, removing duplicates
        activities: customizations.activities 
          ? [...new Set([...originalPackage.activities, ...customizations.activities])]
          : originalPackage.activities,
        // Merge meals preferences
        meals: {
          ...originalPackage.meals,
          ...(customizations.meals || {}),
        },
        // Use custom itinerary or keep original
        itinerary: customizations.itinerary || originalPackage.itinerary,
        termsAndConditions: originalPackage.termsAndConditions,
        availability: originalPackage.availability,
        rating: originalPackage.rating,
      };

      // Create and save the new customized package
      const newPackage = new Package(customizedPackage);
      await newPackage.save();

      return {
        success: true,
        data: newPackage,
      };
    } catch (err: any) {
      return error(400, {
        message: "Failed to customize package",
        errors: [
          {
            type: "ValidationError",
            path: [],
            message: err.message,
          },
        ],
      });
    }
  }
}
