import Activity, { ActivityInterface } from "../models/Activity";
import Destination from "../models/Destination";
import { error } from "elysia";

export default class ActivityController {
  /**
   * Retrieve all activities with pagination and filtering
   * @throws {Error} 400 - Invalid search parameters
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
        return error(404, {
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
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to fetch activities",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  /**
   * Get activity by ID
   * @throws {Error} 404 - Activity not found
   */
  async getActivityById(id: string) {
    try {
      const activity = await Activity.findById(id).populate(
        "destination",
        "name location"
      );
      if (!activity) {
        throw new Error(
          JSON.stringify({
            message: "Activity not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Activity with the specified ID does not exist",
              },
            ],
          })
        );
      }

      return {
        status: "success",
        data: { activity },
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to fetch activity",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  /**
   * Create a new activity
   * @throws {Error} 400 - Invalid activity data
   */
  async createActivity(activityData: Partial<ActivityInterface>) {
    try {
      // Check if destination exists
      if (activityData.destination) {
        const destinationExists = await Destination.exists({
          _id: activityData.destination,
        });
        if (!destinationExists) {
          return error(400, {
            message: "Invalid destination",
            errors: [
              {
                type: "ValidationError",
                path: ["destination"],
                message: "Destination does not exist",
              },
            ],
          });
        }
      }

      const activity = new Activity(activityData);
      await activity.save();

      return {
        status: "success",
        data: activity,
      };
    } catch (err: any) {
      return error(400, {
        message: "Failed to create activity",
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
   * Update activity by ID
   * @throws {Error} 404 - Activity not found
   * @throws {Error} 400 - Invalid update data
   */
  async updateActivity(id: string, updateData: Partial<ActivityInterface>) {
    try {
      // Check if destination exists if it's being updated
      if (updateData.destination) {
        const destinationExists = await Destination.exists({
          _id: updateData.destination,
        });
        if (!destinationExists) {
          return error(400, {
            message: "Invalid destination",
            errors: [
              {
                type: "ValidationError",
                path: ["destination"],
                message: "Destination does not exist",
              },
            ],
          });
        }
      }

      const activity = await Activity.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!activity) {
        throw new Error(
          JSON.stringify({
            message: "Activity not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Activity with the specified ID does not exist",
              },
            ],
          })
        );
      }

      return {
        status: "success",
        data: { activity },
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to update activity",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  /**
   * Delete activity by ID
   * @throws {Error} 404 - Activity not found
   */
  async deleteActivity(id: string) {
    try {
      const activity = await Activity.findByIdAndDelete(id);
      if (!activity) {
        throw new Error(
          JSON.stringify({
            message: "Activity not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Activity with the specified ID does not exist",
              },
            ],
          })
        );
      }

      return {
        status: "success",
        data: null,
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to delete activity",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }

  /**
   * Get activities by destination
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
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to fetch destination activities",
          errors: [
            {
              type: "ServerError",
              path: [],
              message: error.message,
            },
          ],
        })
      );
    }
  }
}
