import { Request, error } from "elysia";
import { getUserId } from "../utils/helpers";
import { type ApiResponse } from "../utils/types";
import Booking from "../models/Booking";
import Hotel from "../models/Hotel";
import Vehicle from "../models/Vehicle";
import {
  BookingInterface,
  BookingSearchParams,
  CreateBookingDTO,
  UpdateBookingDTO,
} from "../utils/types";

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
  public async getBookings(
    params: BookingSearchParams
  ): Promise<{ bookings: BookingInterface[]; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        paymentStatus,
        startDate,
        endDate,
        sortBy = "bookingDate",
        sortOrder = "desc",
      } = params;

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

      const skipCount = (page - 1) * limit;
      const filter: Record<string, any> = {};

      if (status) filter.status = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (startDate) filter.startDate = { $gte: new Date(startDate) };
      if (endDate) filter.endDate = { $lte: new Date(endDate) };

      const sortOptions: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      };

      const [bookings, totalBookingsCount] = await Promise.all([
        Booking.find(filter)
          .skip(skipCount)
          .limit(limit)
          .sort(sortOptions)
          .populate("user", "firstName lastName email phone")
          .populate("hotel", "name city country")
          .populate("vehicle", "make model vehicleType")
          .exec(),
        Booking.countDocuments(filter).exec(),
      ]);

      const totalPages = Math.ceil(totalBookingsCount / limit);

      return {
        bookings,
        totalPages,
        currentPage: page,
        totalBookings: totalBookingsCount,
      };
    } catch (err) {
      console.error("Error fetching bookings:", err);
      return error(500, {
        message: "Internal Server Error",
        errors: [
          {
            type: "InternalServerError",
            path: [],
            message: "An unexpected error occurred",
          },
        ],
      });
    }
  }

  /**
   * Retrieve bookings for the current user
   */
  public async getMyBookings(
    params: BookingSearchParams
  ): Promise<{ bookings: BookingInterface[]; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        paymentStatus,
        startDate,
        endDate,
        type,
        sortBy = "bookingDate",
        sortOrder = "desc",
      } = params;

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

      const skipCount = (page - 1) * limit;
      const filter: Record<string, any> = { user: this.userId };

      if (status) filter.status = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (startDate) filter.startDate = { $gte: new Date(startDate) };
      if (endDate) filter.endDate = { $lte: new Date(endDate) };
      if (type === "hotel") filter.hotel = { $exists: true };
      if (type === "vehicle") filter.vehicle = { $exists: true };

      const sortOptions: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      };

      const [bookings, totalBookingsCount] = await Promise.all([
        Booking.find(filter)
          .skip(skipCount)
          .limit(limit)
          .sort(sortOptions)
          .populate("hotel", "name city country")
          .populate("vehicle", "make model vehicleType")
          .exec(),
        Booking.countDocuments(filter).exec(),
      ]);

      const totalPages = Math.ceil(totalBookingsCount / limit);

      return {
        bookings,
        totalPages,
        currentPage: page,
        totalBookings: totalBookingsCount,
      };
    } catch (err) {
      console.error("Error fetching user bookings:", err);
      return error(500, {
        message: "Internal Server Error",
        errors: [
          {
            type: "InternalServerError",
            path: [],
            message: "An unexpected error occurred",
          },
        ],
      });
    }
  }

  /**
   * Create a new booking
   */
  public async createBooking(
    data: CreateBookingDTO
  ): Promise<BookingInterface> {
    try {
      const {
        hotelId,
        vehicleId,
        packageId,
        startDate,
        endDate,
        totalPrice,
        bookingDetails,
      } = data;

      if (!hotelId && !vehicleId && !packageId) {
        return error(400, {
          message: "Missing service selection",
          errors: [
            {
              type: "ValidationError",
              path: ["service"],
              message:
                "At least one service (hotel, vehicle, or package) must be booked",
            },
          ],
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return error(400, {
          message: "Invalid date range",
          errors: [
            {
              type: "ValidationError",
              path: ["startDate", "endDate"],
              message: "End date must be after start date",
            },
          ],
        });
      }

      if (hotelId) {
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) {
          return error(404, {
            message: "Hotel not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["hotelId"],
                message: "Invalid hotel ID",
              },
            ],
          });
        }
      }

      if (vehicleId) {
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
          return error(404, {
            message: "Vehicle not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["vehicleId"],
                message: "Invalid vehicle ID",
              },
            ],
          });
        }

        const isAvailable = vehicle.isAvailableForDates(start, end);
        if (!isAvailable) {
          return error(400, {
            message: "Vehicle not available",
            errors: [
              {
                type: "ValidationError",
                path: ["vehicleId"],
                message: "Vehicle is not available for the selected dates",
              },
            ],
          });
        }
      }

      const booking = new Booking({
        user: this.userId,
        hotel: hotelId,
        vehicle: vehicleId,
        travelPackage: packageId,
        startDate: start,
        endDate: end,
        totalPrice,
        bookingDetails,
        bookingDate: new Date(),
        status: "Pending",
        paymentStatus: "Unpaid",
      });

      await booking.save();

      const populatedBooking = await Booking.findById(booking._id)
        .populate("hotel", "name city country")
        .populate("vehicle", "make model vehicleType")
        .exec();

      return populatedBooking;
    } catch (err) {
      console.error("Error creating booking:", err);
      return error(500, {
        message: "Internal Server Error",
        errors: [
          {
            type: "InternalServerError",
            path: [],
            message: "An unexpected error occurred",
          },
        ],
      });
    }
  }

  /**
   * Update a booking
   */
  public async updateBooking(
    bookingId: string,
    data: UpdateBookingDTO
  ): Promise<BookingInterface> {
    try {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return error(404, {
          message: "Booking not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["bookingId"],
              message: "Invalid booking ID",
            },
          ],
        });
      }

      if (booking.user.toString() !== this.userId) {
        return error(401, {
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Access denied",
            },
          ],
        });
      }

      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (start >= end) {
          return error(400, {
            message: "Invalid date range",
            errors: [
              {
                type: "ValidationError",
                path: ["startDate", "endDate"],
                message: "End date must be after start date",
              },
            ],
          });
        }
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        { $set: data },
        { new: true }
      )
        .populate("hotel", "name city country")
        .populate("vehicle", "make model vehicleType")
        .exec();

      return updatedBooking;
    } catch (err) {
      console.error("Error updating booking:", err);
      return error(500, {
        message: "Internal Server Error",
        errors: [
          {
            type: "InternalServerError",
            path: [],
            message: "An unexpected error occurred",
          },
        ],
      });
    }
  }

  /**
   * Cancel a booking
   */
  public async cancelBooking(bookingId: string) {
    try {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return error(404, {
          message: "Booking not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["bookingId"],
              message: "Invalid booking ID",
            },
          ],
        });
      }

      if (booking.user.toString() !== this.userId) {
        return error(401, {
          message: "Unauthorized",
          errors: [
            {
              type: "AuthError",
              path: ["authorization"],
              message: "Access denied",
            },
          ],
        });
      }

      const now = new Date();
      const startDate = new Date(booking.startDate);
      const hoursUntilStart =
        (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilStart < 24) {
        return error(400, {
          message: "Cancellation window expired",
          errors: [
            {
              type: "ValidationError",
              path: ["startDate"],
              message:
                "Cannot cancel booking less than 24 hours before start time",
            },
          ],
        });
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        { $set: { status: "Cancelled" } },
        { new: true }
      )
        .populate("hotel", "name city country")
        .populate("vehicle", "make model vehicleType")
        .exec();

      return updatedBooking;
    } catch (err) {
      console.error("Error cancelling booking:", err);
      return error(500, {
        message: "Internal Server Error",
        errors: [
          {
            type: "InternalServerError",
            path: [],
            message: "An unexpected error occurred",
          },
        ],
      });
    }
  }
}
