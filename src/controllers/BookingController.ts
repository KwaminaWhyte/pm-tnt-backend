import { Request, error } from "elysia";
import { getUserId } from "../utils/helpers";
import { type ApiResponse } from "../utils/types";
import Booking from "../models/Booking";
import Hotel from "../models/Hotel";
import Vehicle from "../models/Vehicle";
import Package from "../models/Package";
import {
  BookingInterface,
  BookingSearchParams,
  CreateBookingDTO,
  UpdateBookingDTO,
} from "../utils/types";
import mongoose from "mongoose";

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
  ): Promise<ApiResponse<{ bookings: BookingInterface[]; totalPages: number }>> {
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

      const filter: Record<string, any> = { userId: this.userId };

      if (status) {
        filter.status = status;
      }

      if (paymentStatus) {
        filter["payment.status"] = paymentStatus;
      }

      if (startDate || endDate) {
        filter.bookingDate = {};
        if (startDate) filter.bookingDate.$gte = new Date(startDate);
        if (endDate) filter.bookingDate.$lte = new Date(endDate);
      }

      const sort: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      };

      const totalDocs = await Booking.countDocuments(filter);
      const totalPages = Math.ceil(totalDocs / limit);

      const bookings = await Booking.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("hotelBooking.hotelId", "name location rating")
        .populate("vehicleBooking.vehicleId", "make model year")
        .populate("packageBooking.packageId", "name description price");

      return {
        success: true,
        data: {
          bookings,
          totalPages,
        },
      };
    } catch (err) {
      return error(500, {
        message: "Error retrieving bookings",
        error: err,
      });
    }
  }

  /**
   * Get a single booking by ID
   */
  public async getBookingById(bookingId: string): Promise<ApiResponse<BookingInterface>> {
    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        userId: this.userId,
      })
        .populate("hotelBooking.hotelId", "name location rating images")
        .populate("hotelBooking.roomIds", "type amenities price")
        .populate("vehicleBooking.vehicleId", "make model year images specifications")
        .populate("packageBooking.packageId", "name description price inclusions")
        .populate("packageBooking.customizations.itemId");

      if (!booking) {
        return error(404, { message: "Booking not found" });
      }

      return {
        success: true,
        data: booking,
      };
    } catch (err) {
      return error(500, {
        message: "Error retrieving booking",
        error: err,
      });
    }
  }

  /**
   * Get bookings for a specific user
   */
  public async getUserBookings(
    userId: string,
    params: BookingSearchParams
  ): Promise<ApiResponse<{ bookings: BookingInterface[]; totalPages: number }>> {
    // Temporarily set the userId for this request
    const originalUserId = this.userId;
    this.userId = userId;

    try {
      // Use the existing getBookings method
      const result = await this.getBookings(params);
      return result;
    } finally {
      // Restore the original userId
      this.userId = originalUserId;
    }
  }

  /**
   * Create a new booking
   */
  public async createBooking(
    bookingData: CreateBookingDTO
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      const booking = new Booking({
        ...bookingData,
        userId: this.userId,
        bookingReference: this.generateBookingReference(),
        status: "Pending",
        payment: {
          status: "Pending",
          amount: await this.calculateTotalAmount(bookingData),
          currency: "USD",
        },
      });

      // Validate availability before creating booking
      await this.validateAvailability(bookingData);

      const savedBooking = await booking.save();

      // Update inventory for the booked items
      await this.updateInventory(savedBooking, "reserve");

      return {
        success: true,
        data: savedBooking,
      };
    } catch (err) {
      return error(500, {
        message: "Error creating booking",
        error: err,
      });
    }
  }

  /**
   * Update a booking
   */
  public async updateBooking(
    bookingId: string,
    updateData: UpdateBookingDTO
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        userId: this.userId,
      });

      if (!booking) {
        return error(404, { message: "Booking not found" });
      }

      if (!this.canUpdateBooking(booking)) {
        return error(400, {
          message: "Booking cannot be updated in its current state",
        });
      }

      // If changing dates or items, validate availability
      if (this.requiresAvailabilityCheck(updateData)) {
        await this.validateAvailability(updateData);
      }

      // Update inventory if items changed
      if (this.itemsChanged(booking, updateData)) {
        await this.updateInventory(booking, "release");
        await this.updateInventory({ ...booking.toObject(), ...updateData }, "reserve");
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      )
        .populate("hotelBooking.hotelId")
        .populate("vehicleBooking.vehicleId")
        .populate("packageBooking.packageId");

      return {
        success: true,
        data: updatedBooking,
      };
    } catch (err) {
      return error(500, {
        message: "Error updating booking",
        error: err,
      });
    }
  }

  /**
   * Cancel a booking
   */
  public async cancelBooking(bookingId: string): Promise<ApiResponse<BookingInterface>> {
    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        userId: this.userId,
      });

      if (!booking) {
        return error(404, { message: "Booking not found" });
      }

      if (!this.canCancelBooking(booking)) {
        return error(400, {
          message: "Booking cannot be cancelled in its current state",
        });
      }

      // Calculate refund amount based on cancellation policy
      const refundAmount = await this.calculateRefundAmount(booking);

      // Update booking status
      booking.status = "Cancelled";
      booking.cancellation = {
        date: new Date(),
        reason: "Customer requested cancellation",
        refundAmount,
        refundStatus: refundAmount > 0 ? "Pending" : "NotApplicable",
      };

      // Release inventory
      await this.updateInventory(booking, "release");

      const updatedBooking = await booking.save();

      return {
        success: true,
        data: updatedBooking,
      };
    } catch (err) {
      return error(500, {
        message: "Error cancelling booking",
        error: err,
      });
    }
  }

  /**
   * Update booking itinerary progress
   */
  public async updateItineraryProgress(
    bookingId: string,
    activityId: string,
    status: "completed" | "upcoming"
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        userId: this.userId,
      });

      if (!booking) {
        return error(404, { message: "Booking not found" });
      }

      if (status === "completed") {
        booking.itinerary.progress.completedActivities.push(new mongoose.Types.ObjectId(activityId));
        const nextActivityIndex = booking.itinerary.progress.completedActivities.length;
        if (booking.packageBooking?.customizations?.[nextActivityIndex]) {
          booking.itinerary.progress.nextActivity = booking.packageBooking.customizations[nextActivityIndex].itemId;
        }
      }

      const updatedBooking = await booking.save();

      return {
        success: true,
        data: updatedBooking,
      };
    } catch (err) {
      return error(500, {
        message: "Error updating itinerary progress",
        error: err,
      });
    }
  }

  // Private helper methods

  private generateBookingReference(): string {
    return `BK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  }

  private async calculateTotalAmount(bookingData: CreateBookingDTO): Promise<number> {
    let total = 0;

    if (bookingData.hotelBooking) {
      const hotel = await Hotel.findById(bookingData.hotelBooking.hotelId);
      if (hotel) {
        // Add hotel room costs
        total += hotel.basePrice * bookingData.hotelBooking.numberOfNights;
      }
    }

    if (bookingData.vehicleBooking) {
      const vehicle = await Vehicle.findById(bookingData.vehicleBooking.vehicleId);
      if (vehicle) {
        // Add vehicle rental costs
        total += vehicle.rentalPrice * bookingData.vehicleBooking.numberOfDays;
      }
    }

    if (bookingData.packageBooking) {
      const pkg = await Package.findById(bookingData.packageBooking.packageId);
      if (pkg) {
        // Add package base price
        total += pkg.basePrice;
        // Add customization costs
        total += this.calculateCustomizationsCost(bookingData.packageBooking.customizations);
      }
    }

    return total;
  }

  private async validateAvailability(bookingData: CreateBookingDTO | UpdateBookingDTO): Promise<void> {
    if (bookingData.hotelBooking) {
      const isHotelAvailable = await this.checkHotelAvailability(
        bookingData.hotelBooking.hotelId,
        bookingData.hotelBooking.checkIn,
        bookingData.hotelBooking.checkOut
      );
      if (!isHotelAvailable) {
        throw new Error("Selected hotel rooms are not available for the specified dates");
      }
    }

    if (bookingData.vehicleBooking) {
      const isVehicleAvailable = await this.checkVehicleAvailability(
        bookingData.vehicleBooking.vehicleId,
        bookingData.vehicleBooking.pickupDate,
        bookingData.vehicleBooking.returnDate
      );
      if (!isVehicleAvailable) {
        throw new Error("Selected vehicle is not available for the specified dates");
      }
    }

    if (bookingData.packageBooking) {
      const isPackageAvailable = await this.checkPackageAvailability(
        bookingData.packageBooking.packageId,
        bookingData.packageBooking.startDate,
        bookingData.packageBooking.participants
      );
      if (!isPackageAvailable) {
        throw new Error("Selected package is not available for the specified dates and participants");
      }
    }
  }

  private canUpdateBooking(booking: BookingInterface): boolean {
    const nonUpdateableStatuses = ["Completed", "Cancelled", "InProgress"];
    return !nonUpdateableStatuses.includes(booking.status);
  }

  private canCancelBooking(booking: BookingInterface): boolean {
    const nonCancellableStatuses = ["Completed", "Cancelled"];
    return !nonCancellableStatuses.includes(booking.status);
  }

  private async calculateRefundAmount(booking: BookingInterface): Promise<number> {
    const cancellationDate = new Date();
    const bookingStartDate = new Date(booking.bookingDate);
    const daysUntilBooking = Math.ceil(
      (bookingStartDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let refundPercentage = 0;
    if (daysUntilBooking > 30) {
      refundPercentage = 100;
    } else if (daysUntilBooking > 14) {
      refundPercentage = 75;
    } else if (daysUntilBooking > 7) {
      refundPercentage = 50;
    } else if (daysUntilBooking > 3) {
      refundPercentage = 25;
    }

    return (booking.payment.amount * refundPercentage) / 100;
  }

  private async updateInventory(booking: BookingInterface, action: "reserve" | "release"): Promise<void> {
    if (booking.hotelBooking) {
      await this.updateHotelInventory(booking.hotelBooking, action);
    }
    if (booking.vehicleBooking) {
      await this.updateVehicleInventory(booking.vehicleBooking, action);
    }
    if (booking.packageBooking) {
      await this.updatePackageInventory(booking.packageBooking, action);
    }
  }

  private requiresAvailabilityCheck(updateData: UpdateBookingDTO): boolean {
    return !!(
      updateData.hotelBooking?.checkIn ||
      updateData.hotelBooking?.checkOut ||
      updateData.vehicleBooking?.pickupDate ||
      updateData.vehicleBooking?.returnDate ||
      updateData.packageBooking?.startDate
    );
  }

  private itemsChanged(oldBooking: BookingInterface, newData: UpdateBookingDTO): boolean {
    return !!(
      (newData.hotelBooking && oldBooking.hotelBooking?.hotelId !== newData.hotelBooking.hotelId) ||
      (newData.vehicleBooking && oldBooking.vehicleBooking?.vehicleId !== newData.vehicleBooking.vehicleId) ||
      (newData.packageBooking && oldBooking.packageBooking?.packageId !== newData.packageBooking.packageId)
    );
  }
}
