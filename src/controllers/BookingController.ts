import { error } from "elysia";
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
import { ElysiaCustomStatusResponse } from "elysia/dist/error";

// Define the booking type interfaces to clarify typings
interface HotelBookingType {
  hotelId: string;
  roomIds: string[];
  checkIn: string | Date;
  checkOut: string | Date;
  numberOfNights: number;
}

interface VehicleBookingType {
  vehicleId: string;
  pickupDate: string | Date;
  returnDate: string | Date;
  numberOfDays: number;
}

interface PackageBookingType {
  packageId: string;
  startDate: string | Date;
  participants: number | Array<{ type: string; count: number }>;
  specialRequests?: string;
  customizations?:
    | Array<{ itemId: string; type: string; price: number }>
    | {
        preferences?: string[];
        dietaryRestrictions?: string[];
      };
}

// Extended interfaces for our DTOs
interface ExtendedCreateBookingDTO extends CreateBookingDTO {
  userId: string;
  hotelBooking?: HotelBookingType;
  vehicleBooking?: VehicleBookingType;
  packageBooking?: PackageBookingType;
}

interface ExtendedUpdateBookingDTO extends UpdateBookingDTO {
  hotelBooking?: Partial<HotelBookingType>;
  vehicleBooking?: Partial<VehicleBookingType>;
  packageBooking?: Partial<PackageBookingType>;
}

// Extended BookingInterface for our internal usage
interface ExtendedBookingInterface extends BookingInterface {
  hotelBooking?: HotelBookingType;
  vehicleBooking?: VehicleBookingType;
  packageBooking?: PackageBookingType;
  itinerary?: {
    progress: {
      completedActivities: mongoose.Types.ObjectId[];
      nextActivity?: mongoose.Types.ObjectId;
    };
  };
}

export default class BookingController {
  constructor() {}

  /**
   * Retrieve all bookings with pagination and filtering
   */
  public async getBookings(
    params: BookingSearchParams & { userId?: string }
  ): Promise<
    | ApiResponse<{ bookings: BookingInterface[]; totalPages: number }>
    | ElysiaCustomStatusResponse<
        500,
        {
          readonly message: "Error retrieving bookings";
          readonly error: unknown;
        },
        500
      >
  > {
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
        userId,
        bookingType,
      } = params;

      const filter: Record<string, any> = {};

      if (userId) {
        filter.userId = userId;
      }

      if (status) {
        if (status.includes(",")) {
          // Handle multiple statuses
          const statusArray = status.split(",").map((s) => s.trim());
          filter.status = { $in: statusArray };
        } else {
          // Handle single status
          filter.status = status;
        }
      }

      if (bookingType && bookingType !== "all") {
        filter.bookingType = bookingType;
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
        .populate("hotelBooking.hotelId")
        .populate("vehicleBooking.vehicleId")
        .populate("packageBooking.packageId");

      return {
        success: true,
        statusCode: 200,
        message: "Bookings retrieved successfully",
        timestamp: new Date().toISOString(),
        data: {
          bookings,
          totalPages,
        },
      };
    } catch (err) {
      console.log(err);
      return error(500, {
        message: "Error retrieving bookings",
        error: err,
      });
    }
  }

  /**
   * Get a single booking by ID
   */
  public async getBookingById(
    bookingId: string,
    userId?: string
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      const filter: Record<string, any> = { _id: bookingId };
      if (userId) {
        filter.userId = userId;
      }

      const booking = await Booking.findOne(filter)
        .populate("hotelBooking.hotelId", "name location rating images")
        .populate("hotelBooking.roomIds", "type amenities price")
        .populate(
          "vehicleBooking.vehicleId",
          "make model year images specifications"
        )
        .populate(
          "packageBooking.packageId",
          "name description price inclusions"
        );
      // .populate("packageBooking.customizations.itemId");

      if (!booking) {
        return error(404, { message: "Booking not found" });
      }

      return {
        success: true,
        statusCode: 200,
        message: "Booking retrieved successfully",
        timestamp: new Date(),
        data: booking,
      };
    } catch (err) {
      console.log(err);

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
  ): Promise<
    ApiResponse<{ bookings: BookingInterface[]; totalPages: number }>
  > {
    return this.getBookings({ ...params, userId });
  }

  /**
   * Create a new booking
   */
  public async createBooking(
    bookingData: ExtendedCreateBookingDTO
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      await this.validateAvailability(bookingData);

      const totalAmount = await this.calculateTotalAmount(bookingData);
      const bookingReference = this.generateBookingReference();

      // Ensure required fields are present
      if (!bookingData.bookingType) {
        // Determine booking type based on provided booking data
        if (bookingData.packageBooking) {
          bookingData.bookingType = "package";
        } else if (bookingData.hotelBooking) {
          bookingData.bookingType = "hotel";
        } else if (bookingData.vehicleBooking) {
          bookingData.bookingType = "vehicle";
        } else {
          return error(400, { message: "Booking type is required" });
        }
      }

      // Set start and end dates if not provided
      if (!bookingData.startDate) {
        if (bookingData.packageBooking?.startDate) {
          bookingData.startDate = bookingData.packageBooking.startDate;
        } else if (bookingData.hotelBooking?.checkIn) {
          bookingData.startDate = bookingData.hotelBooking.checkIn;
        } else if (bookingData.vehicleBooking?.pickupDate) {
          bookingData.startDate = bookingData.vehicleBooking.pickupDate;
        }
      }

      if (!bookingData.endDate) {
        if (bookingData.hotelBooking?.checkOut) {
          bookingData.endDate = bookingData.hotelBooking.checkOut;
        } else if (bookingData.vehicleBooking?.returnDate) {
          bookingData.endDate = bookingData.vehicleBooking.returnDate;
        } else if (bookingData.startDate) {
          // Default end date is 7 days after start date
          const startDate = new Date(bookingData.startDate);
          const endDate = new Date(
            startDate.getTime() + 7 * 24 * 60 * 60 * 1000
          );
          bookingData.endDate = endDate.toISOString();
        }
      }

      // Ensure pricing information is present
      if (!bookingData.pricing) {
        bookingData.pricing = {
          basePrice: totalAmount * 0.9, // 90% of total is base price
          taxes: totalAmount * 0.1, // 10% is taxes
          totalPrice: totalAmount,
          fees: [],
          discounts: [],
        };
      } else {
        // If pricing object exists but required fields are missing
        if (!bookingData.pricing.basePrice) {
          bookingData.pricing.basePrice = totalAmount * 0.9;
        }
        if (!bookingData.pricing.taxes) {
          bookingData.pricing.taxes = totalAmount * 0.1;
        }
        if (!bookingData.pricing.totalPrice) {
          bookingData.pricing.totalPrice = totalAmount;
        }
      }

      const booking = new Booking({
        userId: bookingData.userId,
        bookingReference,
        status: "Pending",
        payment: {
          status: "Pending",
          amount: totalAmount,
          currency: "USD",
        },
        ...bookingData,
      });

      // Validate availability before creating booking
      await this.updateInventory(
        booking as ExtendedBookingInterface,
        "reserve"
      );

      const savedBooking = await booking.save();

      return {
        success: true,
        statusCode: 201,
        message: "Booking created successfully",
        timestamp: new Date(),
        data: savedBooking,
      };
    } catch (err) {
      console.log(err);
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
    updateData: ExtendedUpdateBookingDTO,
    userId?: string
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      const filter: Record<string, any> = { _id: bookingId };
      if (userId) {
        filter.userId = userId;
      }

      const booking = await Booking.findOne(filter);

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
      if (this.itemsChanged(booking as ExtendedBookingInterface, updateData)) {
        await this.updateInventory(
          booking as ExtendedBookingInterface,
          "release"
        );

        // Create a typed merged object for inventory update
        const mergedBooking: ExtendedBookingInterface = {
          ...booking.toObject(),
          ...(updateData as any), // Type assertion to avoid incompatibility
        };

        await this.updateInventory(mergedBooking, "reserve");
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
        statusCode: 200,
        message: "Booking updated successfully",
        timestamp: new Date(),
        data: updatedBooking || undefined,
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
  public async cancelBooking(
    bookingId: string,
    userId?: string
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      const filter: Record<string, any> = { _id: bookingId };
      if (userId) {
        filter.userId = userId;
      }

      const booking = await Booking.findOne(filter);

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
      if (!booking.cancellation) {
        booking.cancellation = {} as any;
      }
      booking.cancellation.cancelledAt = new Date();
      booking.cancellation.reason = "Customer requested cancellation";
      booking.cancellation.refundAmount = refundAmount;
      booking.cancellation.cancellationFee =
        (booking.payment.paidAmount || 0) - refundAmount;

      // Release inventory
      await this.updateInventory(
        booking as ExtendedBookingInterface,
        "release"
      );

      const updatedBooking = await booking.save();

      return {
        success: true,
        statusCode: 200,
        message: "Booking cancelled successfully",
        timestamp: new Date(),
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
    status: "completed" | "upcoming",
    userId?: string
  ): Promise<ApiResponse<BookingInterface>> {
    try {
      const filter: Record<string, any> = { _id: bookingId };
      if (userId) {
        filter.userId = userId;
      }

      const booking = (await Booking.findOne(
        filter
      )) as ExtendedBookingInterface;

      if (!booking) {
        return error(404, { message: "Booking not found" });
      }

      if (status === "completed") {
        if (!booking.itinerary) {
          booking.itinerary = {
            progress: {
              completedActivities: [],
            },
          };
        }

        if (!booking.itinerary.progress) {
          booking.itinerary.progress = {
            completedActivities: [],
          };
        }

        booking.itinerary.progress.completedActivities.push(
          new mongoose.Types.ObjectId(activityId)
        );

        const nextActivityIndex =
          booking.itinerary.progress.completedActivities.length;

        if (booking.packageBooking?.customizations?.[nextActivityIndex]) {
          booking.itinerary.progress.nextActivity = booking.packageBooking
            .customizations[nextActivityIndex].itemId as any;
        }
      }

      const updatedBooking = await (booking as any).save();

      return {
        success: true,
        statusCode: 200,
        message: "Itinerary progress updated successfully",
        timestamp: new Date(),
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
    return `BK${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;
  }

  private async calculateTotalAmount(
    bookingData: ExtendedCreateBookingDTO
  ): Promise<number> {
    let total = 0;

    if (bookingData.hotelBooking) {
      const hotel = await Hotel.findById(bookingData.hotelBooking.hotelId);
      if (hotel) {
        // Add hotel room costs
        const basePrice = hotel.basePrice || 0;
        total += basePrice * bookingData.hotelBooking.numberOfNights;
      }
    }

    if (bookingData.vehicleBooking) {
      const vehicle = await Vehicle.findById(
        bookingData.vehicleBooking.vehicleId
      );
      if (vehicle) {
        // Add vehicle rental costs
        const rentalPrice = vehicle.rentalPrice || 0;
        total += rentalPrice * bookingData.vehicleBooking.numberOfDays;
      }
    }

    if (bookingData.packageBooking) {
      const pkg = await Package.findById(bookingData.packageBooking.packageId);
      console.log("Package data for pricing:", pkg);
      if (pkg) {
        // Add package base price - fallback to price if basePrice isn't available
        if (pkg.basePrice !== undefined && pkg.basePrice > 0) {
          total += pkg.basePrice;
          console.log(`Using package basePrice: ${pkg.basePrice}`);
        } else if (pkg.price !== undefined && pkg.price > 0) {
          total += pkg.price;
          console.log(`Using package price: ${pkg.price}`);
        } else {
          console.log("No valid price found for package!");
        }

        // Add customization costs
        const customizationCost = this.calculateCustomizationsCost(
          bookingData.packageBooking.customizations
        );
        console.log(`Customization cost: ${customizationCost}`);
        total += customizationCost;
      } else {
        console.log(
          `Package not found with ID: ${bookingData.packageBooking.packageId}`
        );
      }
    }

    console.log(`Final calculated total: ${total}`);
    // Make sure we don't return NaN
    return isNaN(total) ? 0 : total;
  }

  private async validateAvailability(
    bookingData: ExtendedCreateBookingDTO | ExtendedUpdateBookingDTO
  ): Promise<void> {
    if (bookingData.hotelBooking) {
      const isHotelAvailable = await this.checkHotelAvailability(
        bookingData.hotelBooking.hotelId,
        bookingData.hotelBooking.checkIn,
        bookingData.hotelBooking.checkOut
      );
      if (!isHotelAvailable) {
        throw new Error(
          "Selected hotel rooms are not available for the specified dates"
        );
      }
    }

    if (bookingData.vehicleBooking) {
      const isVehicleAvailable = await this.checkVehicleAvailability(
        bookingData.vehicleBooking.vehicleId,
        bookingData.vehicleBooking.pickupDate,
        bookingData.vehicleBooking.returnDate
      );
      if (!isVehicleAvailable) {
        throw new Error(
          "Selected vehicle is not available for the specified dates"
        );
      }
    }

    if (bookingData.packageBooking) {
      const isPackageAvailable = await this.checkPackageAvailability(
        bookingData.packageBooking.packageId,
        bookingData.packageBooking.startDate as string,
        bookingData.packageBooking.participants
      );
      if (!isPackageAvailable) {
        throw new Error(
          "Selected package is not available for the specified dates and participants"
        );
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

  private async calculateRefundAmount(
    booking: BookingInterface
  ): Promise<number> {
    const cancellationDate = new Date();
    const bookingStartDate = new Date(booking.bookingDate);
    const daysUntilBooking = Math.ceil(
      (bookingStartDate.getTime() - cancellationDate.getTime()) /
        (1000 * 60 * 60 * 24)
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

    // Safe property access with fallback
    const amount =
      booking.payment && booking.payment.paidAmount
        ? booking.payment.paidAmount
        : 0;
    return (amount * refundPercentage) / 100;
  }

  private async updateInventory(
    booking: ExtendedBookingInterface,
    action: "reserve" | "release"
  ): Promise<void> {
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

  private requiresAvailabilityCheck(
    updateData: ExtendedUpdateBookingDTO
  ): boolean {
    return !!(
      updateData.hotelBooking?.checkIn ||
      updateData.hotelBooking?.checkOut ||
      updateData.vehicleBooking?.pickupDate ||
      updateData.vehicleBooking?.returnDate ||
      updateData.packageBooking?.startDate
    );
  }

  private itemsChanged(
    oldBooking: ExtendedBookingInterface,
    newData: ExtendedUpdateBookingDTO
  ): boolean {
    return !!(
      (newData.hotelBooking &&
        oldBooking.hotelBooking?.hotelId !== newData.hotelBooking.hotelId) ||
      (newData.vehicleBooking &&
        oldBooking.vehicleBooking?.vehicleId !==
          newData.vehicleBooking.vehicleId) ||
      (newData.packageBooking &&
        oldBooking.packageBooking?.packageId !==
          newData.packageBooking.packageId)
    );
  }

  private calculateCustomizationsCost(
    customizations?: Array<{ itemId: string; type: string; price: number }>
  ): number {
    if (!customizations || !customizations.length) {
      return 0;
    }

    return customizations.reduce((total, item) => total + (item.price || 0), 0);
  }

  private async checkHotelAvailability(
    hotelId: string,
    checkIn: string | Date,
    checkOut: string | Date
  ): Promise<boolean> {
    try {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        return false;
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      // Check if hotel is available for the specified date range
      // This is a simplified check - in a real application, you would query the availability system
      // or check existing bookings that overlap with the requested dates

      const existingBookings = await Booking.find({
        "hotelBooking.hotelId": hotelId,
        status: { $in: ["Confirmed", "Pending"] },
        $or: [
          {
            // Booking that starts during our period
            "hotelBooking.checkIn": {
              $gte: checkInDate,
              $lt: checkOutDate,
            },
          },
          {
            // Booking that ends during our period
            "hotelBooking.checkOut": {
              $gt: checkInDate,
              $lte: checkOutDate,
            },
          },
          {
            // Booking that spans our entire period
            $and: [
              { "hotelBooking.checkIn": { $lte: checkInDate } },
              { "hotelBooking.checkOut": { $gte: checkOutDate } },
            ],
          },
        ],
      });

      // Check if there's room availability
      const bookedCount = existingBookings.length;
      const maxCapacity = hotel.totalRooms || 10; // Default to 10 if not specified

      return bookedCount < maxCapacity;
    } catch (err) {
      console.error("Error checking hotel availability:", err);
      return false;
    }
  }

  private async checkVehicleAvailability(
    vehicleId: string,
    pickupDate: string | Date,
    returnDate: string | Date
  ): Promise<boolean> {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return false;
      }

      const pickupDateTime = new Date(pickupDate);
      const returnDateTime = new Date(returnDate);

      // Check if vehicle is available for the specified date range
      const existingBookings = await Booking.find({
        "vehicleBooking.vehicleId": vehicleId,
        status: { $in: ["Confirmed", "Pending"] },
        $or: [
          {
            // Booking that starts during our period
            "vehicleBooking.pickupDate": {
              $gte: pickupDateTime,
              $lt: returnDateTime,
            },
          },
          {
            // Booking that ends during our period
            "vehicleBooking.returnDate": {
              $gt: pickupDateTime,
              $lte: returnDateTime,
            },
          },
          {
            // Booking that spans our entire period
            $and: [
              { "vehicleBooking.pickupDate": { $lte: pickupDateTime } },
              { "vehicleBooking.returnDate": { $gte: returnDateTime } },
            ],
          },
        ],
      });

      // Check if there's vehicle availability
      // For simplicity, assuming each vehicle has 1 quantity.
      // If it's a fleet, you'd check against the vehicle.quantity
      return existingBookings.length === 0;
    } catch (err) {
      console.error("Error checking vehicle availability:", err);
      return false;
    }
  }

  private async checkPackageAvailability(
    packageId: string,
    startDate: string,
    participants: number | Array<{ type: string; count: number }>
  ): Promise<boolean> {
    try {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        console.log(`Package with ID ${packageId} not found`);
        return false;
      }

      // Check if the package is active (status = Active)
      if (pkg.status !== "Active") {
        console.log(
          `Package with ID ${packageId} is not active. Status: ${pkg.status}`
        );
        return false;
      }

      // Check if the package is available for the specified dates
      const bookingStartDate = new Date(startDate);

      // Check if the package has specific start dates and if the booking date is one of them
      if (pkg.startDates && pkg.startDates.length > 0) {
        const validStartDate = pkg.startDates.some((date: string) => {
          const packageDate = new Date(date);
          return packageDate.toDateString() === bookingStartDate.toDateString();
        });

        if (!validStartDate) {
          console.log(
            `Booking date ${bookingStartDate} is not in the package's available start dates`
          );
          return false;
        }
      }

      // Check max participants if specified
      if (pkg.maxParticipants) {
        let totalParticipants = 0;

        if (typeof participants === "number") {
          totalParticipants = participants;
        } else {
          totalParticipants = participants.reduce((total, participant) => {
            return total + participant.count;
          }, 0);
        }

        if (totalParticipants > pkg.maxParticipants) {
          console.log(
            `Total participants ${totalParticipants} exceeds maximum allowed ${pkg.maxParticipants}`
          );
          return false;
        }
      }

      // Check if there are any conflicting bookings for this package
      const conflictingBookings = await Booking.countDocuments({
        "packageBooking.packageId": packageId,
        status: { $in: ["Pending", "Confirmed"] },
        // For simplicity, just check if the exact same date is booked
        "packageBooking.startDate": startDate,
      });

      // For packages, we could check against max spots
      if (
        pkg.maxParticipants &&
        !pkg.minParticipants &&
        conflictingBookings >= 1
      ) {
        console.log(
          `Package with ID ${packageId} is already booked for date ${startDate}`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking package availability:", error);
      return false;
    }
  }

  private async updateHotelInventory(
    hotelBooking: HotelBookingType,
    action: "reserve" | "release"
  ): Promise<void> {
    // Update hotel inventory based on the booking action
    // In a real application, this would interact with an inventory management system
    // For now, we'll just log the action
    console.log(
      `${action === "reserve" ? "Reserved" : "Released"} hotel room`,
      hotelBooking
    );
  }

  private async updateVehicleInventory(
    vehicleBooking: VehicleBookingType,
    action: "reserve" | "release"
  ): Promise<void> {
    // Update vehicle inventory based on the booking action
    console.log(
      `${action === "reserve" ? "Reserved" : "Released"} vehicle`,
      vehicleBooking
    );
  }

  private async updatePackageInventory(
    packageBooking: PackageBookingType,
    action: "reserve" | "release"
  ): Promise<void> {
    // Update package inventory based on the booking action
    console.log(
      `${action === "reserve" ? "Reserved" : "Released"} package spot`,
      packageBooking
    );

    // If we're reserving a package, ensure the itinerary is properly set up
    if (action === "reserve") {
      try {
        // Convert participants to the array format if it's a number
        if (typeof packageBooking.participants === "number") {
          // @ts-ignore - We're explicitly changing the type
          packageBooking.participants = [
            {
              type: "adult",
              count: packageBooking.participants,
            },
          ];
        }

        // Initialize itinerary structure if not already present
        // This will be handled by the document schema now

        // Initialize customizations properly if not present or convert if it's in the wrong format
        if (!packageBooking.customizations) {
          packageBooking.customizations = {
            preferences: [],
            dietaryRestrictions: [],
          };
        } else if (Array.isArray(packageBooking.customizations)) {
          // Leave it as is if it's already in the array format
        } else {
          // It's already in the object format, make sure required fields exist
          const customObj = packageBooking.customizations as any;
          if (!customObj.preferences) customObj.preferences = [];
          if (!customObj.dietaryRestrictions)
            customObj.dietaryRestrictions = [];
        }
      } catch (error) {
        console.error("Error setting up package itinerary:", error);
      }
    }
  }
}
