import Destination from "../models/Destination";

export default class DestinationController {
  private request: Request;
  private path: string;

  constructor(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    this.request = request;
    this.path = path;
  }

  /**
   * Retrieve all destinations with pagination and filtering
   */
  public async getDestinations({
    page,
    searchTerm,
    limit = 10,
  }: {
    page: number;
    searchTerm?: string;
    limit?: number;
  }): Promise<
    ApiResponse<{ destinations: DestinationInterface[]; totalPages: number }>
  > {
    try {
      const buildRegex = (term: string): RegExp =>
        new RegExp(
          term
            .split(" ")
            .map((word) => `(?=.*${word})`)
            .join(""),
          "i"
        );

      const searchFilter: Record<string, any> = {};
      if (searchTerm) {
        searchFilter.$or = [
          { name: buildRegex(searchTerm) },
          { description: buildRegex(searchTerm) },
        ];
      }

      const [destinations, totalDestinationsCount] = await Promise.all([
        Destination.find(searchFilter)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        Destination.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalDestinationsCount / limit);
      return {
        success: true,
        data: destinations,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalDestinationsCount,
          itemsPerPage: limit
        }
      };
    } catch (err) {
      console.error("Error fetching destinations:", err);
      return error(500, {
        message: "Error fetching destinations",
        errors: [
          {
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Retrieve a single destination by ID
   */
  public async getDestination(
    id: string
  ): Promise<ApiResponse<DestinationInterface>> {
    try {
      const destination = await Destination.findById(id);

      if (!destination) {
        return error(404, {
          message: "Destination not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Destination not found",
            },
          ],
        });
      }

      return createResponse(
        true,
        200,
        "Destination retrieved successfully",
        destination
      );
    } catch (err) {
      console.error("Error retrieving destination:", err);
      return error(500, {
        message: "Error fetching destination",
        errors: [
          {
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Create a new destination
   */
  public async createDestination(
    destinationData: Partial<DestinationInterface>
  ): Promise<ApiResponse<DestinationInterface>> {
    const schema = Joi.object({
      name: Joi.string().required().label("Name"),
      price: Joi.number().positive().required().label("Price"),
      discount: Joi.number().min(0).max(100).label("Discount"),
      description: Joi.string().label("Description"),
      images: Joi.array().items(Joi.string().uri()).label("Images"),
    });

    try {
      const { error, value } = schema.validate(destinationData, {
        abortEarly: false,
      });

      if (error) {
        return error(400, {
          message: "Validation failed",
          errors: error.details.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      const existingDestination = await Destination.findOne({
        name: value.name,
      });

      if (existingDestination) {
        return error(400, {
          message: "Destination already exists",
          errors: [
            {
              field: "name",
              message: "A destination with this name already exists",
            },
          ],
        });
      }

      const destination = new Destination(value);
      const savedDestination = await destination.save();

      return createResponse(
        true,
        201,
        "Destination created successfully",
        savedDestination
      );
    } catch (err) {
      console.error("Error creating destination:", err);
      return error(500, {
        message: "Error creating destination",
        errors: [
          {
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Update an existing destination
   */
  public async updateDestination(
    id: string,
    updateData: Partial<DestinationInterface>
  ): Promise<ApiResponse<DestinationInterface>> {
    try {
      const schema = Joi.object({
        name: Joi.string().label("Name"),
        price: Joi.number().positive().label("Price"),
        discount: Joi.number().min(0).max(100).label("Discount"),
        description: Joi.string().label("Description"),
        images: Joi.array().items(Joi.string().uri()).label("Images"),
      });

      const { error, value } = schema.validate(updateData, {
        abortEarly: false,
      });

      if (error) {
        return error(400, {
          message: "Validation failed",
          errors: error.details.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      if (value.name) {
        const existingDestination = await Destination.findOne({
          name: value.name,
          _id: { $ne: id },
        });

        if (existingDestination) {
          return error(400, {
            message: "Destination already exists",
            errors: [
              {
                field: "name",
                message: "A destination with this name already exists",
              },
            ],
          });
        }
      }

      const updated = await Destination.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return error(404, {
          message: "Destination not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Destination not found",
            },
          ],
        });
      }

      return createResponse(
        true,
        200,
        "Destination updated successfully",
        updated
      );
    } catch (err) {
      console.error("Error updating destination:", err);
      return error(500, {
        message: "Error updating destination",
        errors: [
          {
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Delete a destination
   */
  public async deleteDestination(id: string): Promise<ApiResponse<void>> {
    try {
      const deleted = await Destination.findByIdAndDelete(id);

      if (!deleted) {
        return error(404, {
          message: "Destination not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Destination not found",
            },
          ],
        });
      }

      return createResponse(true, 200, "Destination deleted successfully");
    } catch (err) {
      console.error("Error deleting destination:", err);
      return error(500, {
        message: "Error deleting destination",
        errors: [
          {
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }
}
