import Activity, { ActivityInterface } from "~/models/Activity";
import Destination from "~/models/Destination";
import { NotFoundError, ValidationError, ServerError } from "~/utils/errors";

export default class ActivityController {
  /**
   * Retrieve all activities with pagination and filtering
   * @throws {ValidationError} When pagination parameters are invalid
   * @throws {ServerError} When an unexpected error occurs
   */
  async getActivities({
    page = 1,
    searchTerm,
    limit = 10,
    category,
    destination,
    minPrice,
    maxPrice,
    minDuration,
    maxDuration,
    sortBy,
    sortOrder,
  }: {
    page?: number;
    searchTerm?: string;
    limit?: number;
    category?: string;
    destination?: string;
    minPrice?: number;
    maxPrice?: number;
    minDuration?: number;
    maxDuration?: number;
    sortBy?: "price" | "duration" | "name";
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

      if (category) {
        filter.category = category;
      }

      if (destination) {
        filter.destination = destination;
      }

      if (minPrice !== undefined) {
        filter.price = { ...filter.price, $gte: minPrice };
      }

      if (maxPrice !== undefined) {
        filter.price = { ...filter.price, $lte: maxPrice };
      }

      if (minDuration !== undefined) {
        filter.duration = { ...filter.duration, $gte: minDuration };
      }

      if (maxDuration !== undefined) {
        filter.duration = { ...filter.duration, $lte: maxDuration };
      }

      const sort: Record<string, 1 | -1> = {};
      if (sortBy) {
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sort.createdAt = -1;
      }

      const skipCount = (page - 1) * limit;
      const [activities, totalCount] = await Promise.all([
        Activity.find(filter)
          .populate("destination", "name location")
          .sort(sort)
          .skip(skipCount)
          .limit(limit),
        Activity.countDocuments(filter),
      ]);

      return {
        success: true,
        data: activities,
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
        err instanceof Error ? err.message : "Failed to fetch activities"
      );
    }
  }

  /**
   * Get activity by ID
   * @throws {NotFoundError} When activity is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async getActivityById(id: string) {
    try {
      const activity = await Activity.findById(id).populate(
        "destination",
        "name location"
      );
      if (!activity) {
        throw new NotFoundError("Activity", id);
      }

      return {
        status: "success",
        data: { activity },
      };
    } catch (err: unknown) {
      // Re-throw custom errors directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to fetch activity"
      );
    }
  }

  /**
   * Create a new activity
   * @throws {ValidationError} When activity data is invalid
   * @throws {ServerError} When an unexpected error occurs
   */
  async createActivity(activityData: Partial<ActivityInterface>) {
    try {
      // Check if destination exists if provided
      if (activityData.destination) {
        const destinationExists = await Destination.exists({
          _id: activityData.destination,
        });
        if (!destinationExists) {
          throw new ValidationError(
            "Destination does not exist",
            "destination"
          );
        }
      }

      const activity = new Activity(activityData);
      await activity.save();

      return {
        status: "success",
        data: { activity },
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
        err instanceof Error ? err.message : "Failed to create activity"
      );
    }
  }

  /**
   * Update activity by ID
   * @throws {NotFoundError} When activity is not found
   * @throws {ValidationError} When update data is invalid
   * @throws {ServerError} When an unexpected error occurs
   */
  async updateActivity(id: string, updateData: Partial<ActivityInterface>) {
    try {
      // Check if destination exists if it's being updated
      if (updateData.destination) {
        const destinationExists = await Destination.exists({
          _id: updateData.destination,
        });
        if (!destinationExists) {
          throw new ValidationError(
            "Destination does not exist",
            "destination"
          );
        }
      }

      const activity = await Activity.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!activity) {
        throw new NotFoundError("Activity", id);
      }

      return {
        status: "success",
        data: { activity },
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
        err instanceof Error ? err.message : "Failed to update activity"
      );
    }
  }

  /**
   * Delete activity by ID
   * @throws {NotFoundError} When activity is not found
   * @throws {ServerError} When an unexpected error occurs
   */
  async deleteActivity(id: string) {
    try {
      const activity = await Activity.findByIdAndDelete(id);
      if (!activity) {
        throw new NotFoundError("Activity", id);
      }

      return {
        status: "success",
        data: null,
      };
    } catch (err: unknown) {
      // Re-throw NotFoundError directly
      if (err instanceof NotFoundError) {
        throw err;
      }

      // Convert other errors to ServerError
      throw new ServerError(
        err instanceof Error ? err.message : "Failed to delete activity"
      );
    }
  }

  /**
   * Get activities by destination
   * @throws {ValidationError} When pagination parameters are invalid
   * @throws {ServerError} When an unexpected error occurs
   */
  async getActivitiesByDestination(
    destinationId: string,
    {
      page = 1,
      limit = 10,
      category,
    }: {
      page?: number;
      limit?: number;
      category?: string;
    }
  ) {
    try {
      if (page < 1 || limit < 1) {
        throw new ValidationError(
          "Page and limit must be positive numbers",
          "pagination"
        );
      }

      const filter: Record<string, any> = {
        destination: destinationId,
      };

      if (category) {
        filter.category = category;
      }

      const skipCount = (page - 1) * limit;
      const [activities, totalCount] = await Promise.all([
        Activity.find(filter).skip(skipCount).limit(limit),
        Activity.countDocuments(filter),
      ]);

      return {
        success: true,
        data: activities,
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
        err instanceof Error
          ? err.message
          : "Failed to fetch destination activities"
      );
    }
  }
}
