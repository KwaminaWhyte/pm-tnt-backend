import { error } from "elysia";
import Package from "../models/Package";
import { PackageInterface } from "../utils/types";
import PackageTemplate from "../models/PackageTemplate";
import Hotel from "../models/Hotel";
import Activity from "../models/Activity";

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
      // Validate dates
      if (packageData.availability) {
        const startDate = new Date(packageData.availability.startDate);
        const endDate = new Date(packageData.availability.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return error(400, {
            message: "Invalid date format",
            errors: [
              {
                type: "ValidationError",
                path: ["availability"],
                message: "Start date and end date must be valid dates",
              },
            ],
          });
        }

        if (startDate > endDate) {
          return error(400, {
            message: "Invalid date range",
            errors: [
              {
                type: "ValidationError",
                path: ["availability"],
                message: "Start date must be before end date",
              },
            ],
          });
        }
      }

      // Validate itinerary
      if (packageData.itinerary) {
        const days = packageData.duration?.days || 0;
        const invalidDays = packageData.itinerary.some(
          (item) => item.day > days
        );

        if (invalidDays) {
          return error(400, {
            message: "Invalid itinerary",
            errors: [
              {
                type: "ValidationError",
                path: ["itinerary"],
                message: "Itinerary day cannot exceed package duration",
              },
            ],
          });
        }
      }

      const packageItem = new Package(packageData);
      await packageItem.save();

      return {
        success: true,
        data: packageItem,
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

      return error(500, {
        message: "Failed to create package",
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
        accommodations:
          customizations.accommodations || originalPackage.accommodations,
        // Use custom transportation or keep original
        transportation:
          customizations.transportation || originalPackage.transportation,
        // Merge original and custom activities, removing duplicates
        activities: customizations.activities
          ? [
              ...new Set([
                ...originalPackage.activities,
                ...customizations.activities,
              ]),
            ]
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

  /**
   * Share a package with other users
   */
  async sharePackage(
    packageId: string,
    userId: string,
    sharedWithIds: string[]
  ) {
    try {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        return error(404, { message: "Package not found" });
      }

      if (pkg.userId.toString() !== userId) {
        return error(403, { message: "Not authorized to share this package" });
      }

      pkg.sharing.isPublic = false;
      pkg.sharing.sharedWith = sharedWithIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      await pkg.save();

      return { success: true, message: "Package shared successfully" };
    } catch (err) {
      return error(500, { message: "Error sharing package", error: err });
    }
  }

  /**
   * Update package meal plan
   */
  async updateMealPlan(packageId: string, userId: string, meals: any[]) {
    try {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        return error(404, { message: "Package not found" });
      }

      if (pkg.userId.toString() !== userId) {
        return error(403, { message: "Not authorized to update this package" });
      }

      pkg.meals = meals;
      await pkg.save();

      return { success: true, message: "Meal plan updated successfully" };
    } catch (err) {
      return error(500, { message: "Error updating meal plan", error: err });
    }
  }

  /**
   * Update package budget
   */
  async updateBudget(packageId: string, userId: string, budget: any) {
    try {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        return error(404, { message: "Package not found" });
      }

      if (pkg.userId.toString() !== userId) {
        return error(403, { message: "Not authorized to update this package" });
      }

      pkg.budget = budget;
      await pkg.save();

      return { success: true, message: "Budget updated successfully" };
    } catch (err) {
      return error(500, { message: "Error updating budget", error: err });
    }
  }

  /**
   * Save package customization as a template
   */
  async saveAsTemplate(
    packageId: string,
    userId: string,
    templateData: {
      name: string;
      description?: string;
      customizations: any;
      isPublic?: boolean;
      tags?: string[];
    }
  ) {
    try {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        return error(404, { message: "Package not found" });
      }

      const template = new PackageTemplate({
        userId,
        basePackageId: packageId,
        ...templateData,
      });

      await template.save();

      return {
        success: true,
        data: template,
      };
    } catch (err) {
      return error(500, { message: "Error saving template", error: err });
    }
  }

  /**
   * Get user's package templates
   */
  async getTemplates(
    userId: string,
    filters: {
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const { search, tags, page = 1, limit = 10 } = filters;
      const query: any = { userId };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      if (tags?.length) {
        query.tags = { $all: tags };
      }

      const [templates, total] = await Promise.all([
        PackageTemplate.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("basePackageId", "name description price"),
        PackageTemplate.countDocuments(query),
      ]);

      return {
        success: true,
        data: {
          templates,
          pagination: {
            total,
            page,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (err) {
      return error(500, { message: "Error fetching templates", error: err });
    }
  }

  /**
   * Create package from template
   */
  async createFromTemplate(
    templateId: string,
    userId: string,
    customizations?: any
  ) {
    try {
      const template = await PackageTemplate.findOne({
        _id: templateId,
        $or: [{ userId }, { isPublic: true }],
      }).populate("basePackageId");

      if (!template) {
        return error(404, { message: "Template not found" });
      }

      // Merge template customizations with any additional customizations
      const mergedCustomizations = {
        ...template.customizations,
        ...(customizations || {}),
      };

      // Create new package using template
      const customizedPackage = await this.customizePackage(
        template.basePackageId.toString(),
        mergedCustomizations
      );

      return customizedPackage;
    } catch (err) {
      return error(500, {
        message: "Error creating package from template",
        error: err,
      });
    }
  }

  /**
   * Enhanced customizePackage with more options
   */
  async customizePackage(
    packageId: string,
    customizations: {
      accommodations?: {
        hotelIds?: string[];
        preferences?: {
          roomTypes?: string[];
          amenities?: string[];
          boardBasis?: string[];
          location?: string[];
        };
      };
      transportation?: {
        type?: "Flight" | "Train" | "Bus" | "Private Car" | "None";
        preferences?: {
          class?: string;
          seatingPreference?: string;
          specialAssistance?: string[];
          luggageOptions?: string[];
        };
      };
      activities?: {
        included?: string[];
        excluded?: string[];
        preferences?: {
          difficulty?: string[];
          duration?: string[];
          type?: string[];
          timeOfDay?: string[];
        };
      };
      meals?: {
        included?: {
          breakfast?: boolean;
          lunch?: boolean;
          dinner?: boolean;
        };
        preferences?: {
          dietary?: string[];
          cuisine?: string[];
          mealTimes?: {
            breakfast?: string;
            lunch?: string;
            dinner?: string;
          };
        };
      };
      itinerary?: {
        pace?: "Relaxed" | "Moderate" | "Fast";
        flexibility?: "Fixed" | "Flexible" | "Very Flexible";
        focusAreas?: string[];
        customDays?: Array<{
          day: number;
          title: string;
          description: string;
          activities: string[];
          meals?: {
            breakfast?: string;
            lunch?: string;
            dinner?: string;
          };
        }>;
      };
      accessibility?: {
        wheelchairAccess?: boolean;
        mobilityAssistance?: boolean;
        dietaryRestrictions?: string[];
        medicalRequirements?: string[];
      };
      budget?: {
        maxBudget?: number;
        priorityAreas?: string[];
        flexibleAreas?: string[];
      };
    }
  ) {
    try {
      const originalPackage = await Package.findById(packageId);
      if (!originalPackage) {
        return error(404, { message: "Package not found" });
      }

      // Validate customizations
      await this.validateCustomizations(customizations);

      // Calculate price adjustments based on customizations
      const priceAdjustments = await this.calculatePriceAdjustments(
        customizations
      );

      // Create customized package
      const customizedPackage = {
        name: `${originalPackage.name} (Customized)`,
        basePrice: originalPackage.basePrice + priceAdjustments.total,
        description: originalPackage.description,
        images: originalPackage.images,
        duration: originalPackage.duration,
        accommodations: await this.mergeAccommodations(
          originalPackage.accommodations,
          customizations.accommodations
        ),
        transportation: this.mergeTransportation(
          originalPackage.transportation,
          customizations.transportation
        ),
        activities: await this.mergeActivities(
          originalPackage.activities,
          customizations.activities
        ),
        meals: this.mergeMeals(originalPackage.meals, customizations.meals),
        itinerary: await this.mergeItinerary(
          originalPackage.itinerary,
          customizations.itinerary
        ),
        accessibility: {
          ...originalPackage.accessibility,
          ...customizations.accessibility,
        },
        priceBreakdown: {
          base: originalPackage.basePrice,
          adjustments: priceAdjustments.breakdown,
          total: originalPackage.basePrice + priceAdjustments.total,
        },
      };

      const newPackage = new Package(customizedPackage);
      await newPackage.save();

      return {
        success: true,
        data: newPackage,
      };
    } catch (err) {
      return error(400, { message: "Failed to customize package", error: err });
    }
  }

  // Private helper methods for customization

  private async validateCustomizations(customizations: any) {
    const errors = [];

    if (customizations.budget?.maxBudget < 0) {
      errors.push("Budget cannot be negative");
    }

    if (customizations.itinerary?.customDays) {
      const hasValidDays = customizations.itinerary.customDays.every(
        (day: any) => day.day > 0 && day.title && day.description
      );
      if (!hasValidDays) {
        errors.push("Invalid itinerary day configuration");
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }

  private async calculatePriceAdjustments(customizations: any) {
    let total = 0;
    const breakdown: Record<string, number> = {};

    if (customizations.accommodations?.hotelIds) {
      const hotelPrices = await this.calculateHotelPrices(
        customizations.accommodations.hotelIds
      );
      breakdown.accommodations = hotelPrices;
      total += hotelPrices;
    }

    if (customizations.activities?.included) {
      const activityPrices = await this.calculateActivityPrices(
        customizations.activities.included
      );
      breakdown.activities = activityPrices;
      total += activityPrices;
    }

    // Add other price calculations as needed

    return { total, breakdown };
  }

  private async mergeAccommodations(original: any[], custom?: any) {
    if (!custom) return original;

    const hotels = custom.hotelIds
      ? await Hotel.find({ _id: { $in: custom.hotelIds } })
      : [];

    return {
      hotels,
      preferences: custom.preferences || {},
    };
  }

  private async mergeActivities(original: any[], custom?: any) {
    if (!custom) return original;

    const included = custom.included
      ? await Activity.find({ _id: { $in: custom.included } })
      : [];

    return {
      included,
      excluded: custom.excluded || [],
      preferences: custom.preferences || {},
    };
  }

  private async mergeItinerary(original: any, custom?: any) {
    if (!custom) return original;

    return {
      ...original,
      ...custom,
      customDays: await Promise.all(
        (custom.customDays || []).map(async (day: any) => ({
          ...day,
          activities: await Activity.find({ _id: { $in: day.activities } }),
        }))
      ),
    };
  }
}
