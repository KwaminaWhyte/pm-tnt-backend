import Package from "~/models/Package";
import { PackageInterface } from "~/utils/types";
import PackageTemplate from "~/models/PackageTemplate";
import Hotel from "~/models/Hotel";
import Activity from "~/models/Activity";
import {
  NotFoundError,
  ValidationError,
  ServerError,
  AuthorizationError,
} from "~/utils/errors";
import mongoose from "mongoose";

export default class PackageController {
  /**
   * Retrieve all packages with pagination and filtering
   * @throws {ValidationError} When pagination parameters are invalid
   * @throws {ServerError} When an unexpected error occurs
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
        throw new ValidationError(
          "Page and limit must be positive numbers",
          "pagination"
        );
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
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof ValidationError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to fetch packages"
      );
    }
  }

  /**
   * Get package by ID
   * @throws {NotFoundError} When package is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async getPackageById(id: string) {
    try {
      const packageItem = await Package.findById(id);
      if (!packageItem) {
        throw new NotFoundError("Package", id);
      }

      return {
        success: true,
        data: packageItem,
      };
    } catch (err: unknown) {
      // Re-throw NotFoundError directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to fetch package"
      );
    }
  }

  /**
   * Create a new package
   * @throws {ValidationError} When package data is invalid
   * @throws {ServerError} When an unexpected error occurs
   */
  async createPackage(packageData: Partial<PackageInterface>) {
    try {
      // Validate dates
      if (packageData.availability) {
        const startDate = new Date(packageData.availability.startDate);
        const endDate = new Date(packageData.availability.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new ValidationError(
            "Start date and end date must be valid dates",
            "availability"
          );
        }

        if (startDate > endDate) {
          throw new ValidationError(
            "Start date must be before end date",
            "availability"
          );
        }
      }

      // Validate itinerary
      if (packageData.itinerary) {
        const days = packageData.duration?.days || 0;
        const invalidDays = packageData.itinerary.some(
          (item) => item.day > days
        );

        if (invalidDays) {
          throw new ValidationError(
            "Itinerary day cannot exceed package duration",
            "itinerary"
          );
        }
      }

      const packageItem = new Package(packageData);
      await packageItem.save();

      return {
        success: true,
        data: packageItem,
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof ValidationError) {
        throw err;
      }

      // Handle Mongoose validation errors
      if (
        typeof err === "object" &&
        err !== null &&
        "name" in err &&
        err.name === "ValidationError"
      ) {
        const mongooseErr = err as any;
        const fieldName = Object.keys(mongooseErr.errors)[0] || "unknown";
        const message =
          mongooseErr.errors[fieldName]?.message || "Validation failed";
        throw new ValidationError(message, fieldName);
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to create package"
      );
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
        throw new NotFoundError("Package", id);
      }

      return {
        success: true,
        data: packageItem,
      };
    } catch (err: any) {
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to update package"
      );
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
        throw new NotFoundError("Package", id);
      }

      return {
        success: true,
        message: "Package deleted successfully",
      };
    } catch (err: any) {
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to delete package"
      );
    }
  }

  /**
   * Share a package with other users
   * @throws {NotFoundError} When package is not found
   * @throws {AuthorizationError} When user is not authorized to share the package
   * @throws {ServerError} When an unexpected error occurs
   */
  async sharePackage(
    packageId: string,
    userId: string,
    sharedWithIds: string[]
  ) {
    try {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        throw new NotFoundError("Package", packageId);
      }

      if (pkg.userId.toString() !== userId) {
        throw new AuthorizationError("Not authorized to share this package");
      }

      pkg.sharing.isPublic = false;
      pkg.sharing.sharedWith = sharedWithIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      await pkg.save();

      return { success: true, message: "Package shared successfully" };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError || err instanceof AuthorizationError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Error sharing package"
      );
    }
  }

  /**
   * Update package meal plan
   * @throws {NotFoundError} When package is not found
   * @throws {AuthorizationError} When user is not authorized to update the package
   * @throws {ServerError} When an unexpected error occurs
   */
  async updateMealPlan(packageId: string, userId: string, meals: any[]) {
    try {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        throw new NotFoundError("Package", packageId);
      }

      if (pkg.userId.toString() !== userId) {
        throw new AuthorizationError("Not authorized to update this package");
      }

      pkg.meals = meals;
      await pkg.save();

      return { success: true, message: "Meal plan updated successfully" };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError || err instanceof AuthorizationError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Error updating meal plan"
      );
    }
  }

  /**
   * Update package budget
   * @throws {NotFoundError} When package is not found
   * @throws {AuthorizationError} When user is not authorized to update the package
   * @throws {ServerError} When an unexpected error occurs
   */
  async updateBudget(packageId: string, userId: string, budget: any) {
    try {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        throw new NotFoundError("Package", packageId);
      }

      if (pkg.userId.toString() !== userId) {
        throw new AuthorizationError("Not authorized to update this package");
      }

      pkg.budget = budget;
      await pkg.save();

      return { success: true, message: "Budget updated successfully" };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError || err instanceof AuthorizationError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Error updating budget"
      );
    }
  }

  /**
   * Save package customization as a template
   * @throws {NotFoundError} When package is not found
   * @throws {ValidationError} When template data is invalid
   * @throws {ServerError} When an unexpected error occurs
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
        throw new NotFoundError("Package", packageId);
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
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Handle Mongoose validation errors
      if (
        typeof err === "object" &&
        err !== null &&
        "name" in err &&
        err.name === "ValidationError"
      ) {
        const mongooseErr = err as any;
        const fieldName = Object.keys(mongooseErr.errors)[0] || "unknown";
        const message =
          mongooseErr.errors[fieldName]?.message || "Validation failed";
        throw new ValidationError(message, fieldName);
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Error saving template"
      );
    }
  }

  /**
   * Get user's package templates
   * @throws {ValidationError} When pagination parameters are invalid
   * @throws {ServerError} When an unexpected error occurs
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

      if (page < 1 || limit < 1) {
        throw new ValidationError(
          "Page and limit must be positive numbers",
          "pagination"
        );
      }

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
    } catch (err: unknown) {
      // Re-throw ValidationError directly
      if (err instanceof ValidationError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Error fetching templates"
      );
    }
  }

  /**
   * Create package from template
   * @throws {NotFoundError} When template is not found
   * @throws {ServerError} When an unexpected error occurs
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
        throw new NotFoundError("Template", templateId);
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
    } catch (err: unknown) {
      // Re-throw NotFoundError directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error
          ? err.message
          : "Error creating package from template"
      );
    }
  }

  /**
   * Enhanced customizePackage with more options
   * @throws {NotFoundError} When package is not found
   * @throws {ValidationError} When customizations are invalid
   * @throws {ServerError} When an unexpected error occurs
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
        throw new NotFoundError("Package", packageId);
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
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }

      // Handle Mongoose validation errors
      if (
        typeof err === "object" &&
        err !== null &&
        "name" in err &&
        err.name === "ValidationError"
      ) {
        const mongooseErr = err as any;
        const fieldName = Object.keys(mongooseErr.errors)[0] || "unknown";
        const message =
          mongooseErr.errors[fieldName]?.message || "Validation failed";
        throw new ValidationError(message, fieldName);
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to customize package"
      );
    }
  }

  // Private helper methods for customization

  /**
   * Validate package customizations
   * @throws {ValidationError} When customizations are invalid
   */
  private async validateCustomizations(customizations: any) {
    const errors = [];
    let fieldName = "customizations";

    if (customizations.budget?.maxBudget < 0) {
      errors.push("Budget cannot be negative");
      fieldName = "budget";
    }

    if (customizations.itinerary?.customDays) {
      const hasValidDays = customizations.itinerary.customDays.every(
        (day: any) => day.day > 0 && day.title && day.description
      );
      if (!hasValidDays) {
        errors.push("Invalid itinerary day configuration");
        fieldName = "itinerary";
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Validation failed: ${errors.join(", ")}`,
        fieldName
      );
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
