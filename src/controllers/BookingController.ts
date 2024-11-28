import Booking from "../models/Booking";

export default class BookingController {
  private request: Request;
  private path: string;
  private userId: string;

  constructor(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    this.request = request;
    this.path = path;
    this.userId = getUserId(request);
  }

  /**
   * Retrieve all bookings with pagination and filtering
   */
  public async getBookings({
    page,
    searchTerm,
    limit = 10,
  }: {
    page: number;
    searchTerm?: string;
    limit?: number;
  }): Promise<
    ApiResponse<{ bookings: BookingInterface[]; totalPages: number }>
  > {
    try {
      const skipCount = (page - 1) * limit;

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

      const [bookings, totalBookingsCount] = await Promise.all([
        Booking.find(searchFilter)
          .skip(skipCount)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        Booking.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalBookingsCount / limit);
      return createResponse(true, 200, "Bookings retrieved successfully", {
        bookings,
        totalPages,
      });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return createResponse(false, 500, "Error fetching bookings", undefined, [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ]);
    }
  }

  /**
   * Retrieve bookings for the current user
   */
  public async getMyBookings({
    page,
    searchTerm,
    limit = 10,
  }: {
    page: number;
    searchTerm?: string;
    limit?: number;
  }): Promise<
    ApiResponse<{ bookings: BookingInterface[]; totalPages: number }>
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

      const searchFilter: Record<string, any> = { user: this.userId };
      if (searchTerm) {
        searchFilter.$or = [
          { name: buildRegex(searchTerm) },
          { description: buildRegex(searchTerm) },
        ];
      }

      const [bookings, totalBookingsCount] = await Promise.all([
        Booking.find(searchFilter)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        Booking.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalBookingsCount / limit);
      return createResponse(true, 200, "Your bookings retrieved successfully", {
        bookings,
        totalPages,
      });
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      return createResponse(
        false,
        500,
        "Error fetching your bookings",
        undefined,
        [
          {
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
          },
        ]
      );
    }
  }

  /**
   * Retrieve a single booking by ID
   */
  public async getBooking(id: string): Promise<ApiResponse<BookingInterface>> {
    try {
      const booking = await Booking.findById(id);

      if (!booking) {
        return createResponse(false, 404, "Booking not found");
      }

      return createResponse(
        true,
        200,
        "Booking retrieved successfully",
        booking
      );
    } catch (error) {
      console.error("Error retrieving booking:", error);
      return createResponse(false, 500, "Error fetching booking", undefined, [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ]);
    }
  }

  /**
   * Create a new booking
   */
  public async createBooking(
    bookingData: Partial<BookingInterface>
  ): Promise<ApiResponse<BookingInterface>> {
    const schema = Joi.object({
      hotel: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .label("Hotel ID"),
      vehicle: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .label("Vehicle ID"),
      travelPackage: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .label("Package ID"),
      startDate: Joi.date().greater("now").required().label("Start Date"),
      endDate: Joi.date()
        .greater(Joi.ref("startDate"))
        .required()
        .label("End Date"),
      totalPrice: Joi.number().positive().required().label("Total Price"),
      status: Joi.string()
        .valid("Pending", "Confirmed", "Cancelled")
        .default("Pending")
        .label("Status"),
      paymentStatus: Joi.string()
        .valid("Paid", "Unpaid")
        .default("Unpaid")
        .label("Payment Status"),
    })
      .or("hotel", "vehicle", "travelPackage")
      .label("Booking");

    try {
      const { error, value } = schema.validate(bookingData, {
        abortEarly: false,
      });

      if (error) {
        return createResponse(
          false,
          400,
          "Validation failed",
          undefined,
          error.details.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }))
        );
      }

      const booking = new Booking({
        ...value,
        user: this.userId,
        bookingDate: new Date(),
      });

      const savedBooking = await booking.save();
      return createResponse(
        true,
        201,
        "Booking created successfully",
        savedBooking
      );
    } catch (error) {
      console.error("Error creating booking:", error);
      return createResponse(false, 500, "Error creating booking", undefined, [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ]);
    }
  }

  /**
   * Update an existing booking
   */
  public async updateBooking(
    id: string,
    updateData: Partial<BookingInterface>
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      const schema = Joi.object({
        startDate: Joi.date().greater("now").label("Start Date"),
        endDate: Joi.date().greater(Joi.ref("startDate")).label("End Date"),
        status: Joi.string()
          .valid("Pending", "Confirmed", "Cancelled")
          .label("Status"),
        paymentStatus: Joi.string()
          .valid("Paid", "Unpaid")
          .label("Payment Status"),
      });

      const { error, value } = schema.validate(updateData, {
        abortEarly: false,
      });

      if (error) {
        return createResponse(
          false,
          400,
          "Validation failed",
          undefined,
          error.details.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }))
        );
      }

      const booking = await Booking.findById(id);

      if (!booking) {
        return createResponse(false, 404, "Booking not found");
      }

      if (booking.user.toString() !== this.userId) {
        return createResponse(
          false,
          403,
          "You are not authorized to update this booking"
        );
      }

      const updated = await Booking.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true }
      );

      return createResponse(true, 200, "Booking updated successfully", updated);
    } catch (error) {
      console.error("Error updating booking:", error);
      return createResponse(false, 500, "Error updating booking", undefined, [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ]);
    }
  }

  /**
   * Cancel a booking
   */
  public async cancelBooking(id: string): Promise<ApiResponse<void>> {
    try {
      const booking = await Booking.findById(id);

      if (!booking) {
        return createResponse(false, 404, "Booking not found");
      }

      if (booking.user.toString() !== this.userId) {
        return createResponse(
          false,
          403,
          "You are not authorized to cancel this booking"
        );
      }

      if (booking.status === "Cancelled") {
        return createResponse(false, 400, "Booking is already cancelled");
      }

      await Booking.findByIdAndUpdate(id, {
        $set: { status: "Cancelled" },
      });

      return createResponse(true, 200, "Booking cancelled successfully");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return createResponse(false, 500, "Error cancelling booking", undefined, [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ]);
    }
  }
}
