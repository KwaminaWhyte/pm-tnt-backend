import { HotelInterface } from "~/utils/types";
import Hotel from "~/models/Hotel";
import Booking from "~/models/Booking"; // Assuming you have a Booking model
import Favorite from "~/models/Favorite";
import { error } from "elysia";
import FavoriteController from "./FavoriteController";
import Room from "~/models/Room";
import User from "~/models/User";

export default class HotelController {
  /**
   * Retrieve all hotels with pagination and filtering
   * @throws {Error} 400 - Invalid search parameters
   */
  async getHotels({
    page = 1,
    searchTerm,
    limit = 10,
    city,
    country,
    sortBy,
    sortOrder,
    isAvailable,
  }: {
    page?: number;
    searchTerm?: string;
    limit?: number;
    city?: string;
    country?: string;
    sortBy?: "pricePerNight" | "capacity" | "rating";
    sortOrder?: "asc" | "desc";
    isAvailable?: boolean;
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
          { "location.city": { $regex: searchTerm, $options: "i" } },
          { "location.country": { $regex: searchTerm, $options: "i" } },
        ];
      }

      if (city) {
        filter["location.city"] = { $regex: city, $options: "i" };
      }

      if (country) {
        filter["location.country"] = { $regex: country, $options: "i" };
      }

      if (isAvailable) {
        filter["isAvailable"] = isAvailable;
      }

      const sort: Record<string, 1 | -1> = {};
      if (sortBy) {
        sort[sortBy === "pricePerNight" ? "rooms.pricePerNight" : sortBy] =
          sortOrder === "asc" ? 1 : -1;
      } else {
        sort.createdAt = -1;
      }

      const skipCount = (page - 1) * limit;
      const [hotels, totalCount] = await Promise.all([
        Hotel.find(filter).sort(sort).skip(skipCount).limit(limit),
        Hotel.countDocuments(filter),
      ]);

      return {
        success: true,
        data: hotels,
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
          message: "Failed to fetch hotels",
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
   * Get hotel by ID
   * @throws {Error} 404 - Hotel not found
   */
  async getHotelById(id: string) {
    try {
      const hotel = await Hotel.findById(id);
      if (!hotel) {
        throw new Error(
          JSON.stringify({
            message: "Hotel not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Hotel with the specified ID does not exist",
              },
            ],
          })
        );
      }

      const rooms = await Room.find({ hotel: id });

      return {
        status: "success",
        data: { hotel, rooms },
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to fetch hotel",
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
   * Create a new hotel
   * @throws {Error} 400 - Invalid hotel data
   */
  async createHotel(hotelData: Partial<HotelInterface>) {
    try {
      const hotel = new Hotel(hotelData);
      await hotel.save();

      return {
        status: "success",
        data: hotel,
      };
    } catch (err: any) {
      return error(400, {
        message: "Failed to create hotel",
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
   * Update hotel by ID
   * @throws {Error} 404 - Hotel not found
   * @throws {Error} 400 - Invalid update data
   */
  async updateHotel(id: string, updateData: Partial<HotelInterface>) {
    try {
      const hotel = await Hotel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!hotel) {
        throw new Error(
          JSON.stringify({
            message: "Hotel not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Hotel with the specified ID does not exist",
              },
            ],
          })
        );
      }

      return {
        status: "success",
        data: hotel,
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to update hotel",
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
   * Delete hotel by ID
   * @throws {Error} 404 - Hotel not found
   */
  async deleteHotel(id: string) {
    try {
      const hotel = await Hotel.findByIdAndDelete(id);

      if (!hotel) {
        throw new Error(
          JSON.stringify({
            message: "Hotel not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Hotel with the specified ID does not exist",
              },
            ],
          })
        );
      }

      return {
        status: "success",
        data: hotel,
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to delete hotel",
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
   * Add rating to hotel
   * @throws {Error} 404 - Hotel not found
   * @throws {Error} 400 - Invalid rating data
   */
  async addRating(
    id: string,
    ratingData: { userId: string; rating: number; comment?: string }
  ) {
    try {
      const hotel = await Hotel.findById(id);

      if (!hotel) {
        throw new Error(
          JSON.stringify({
            message: "Hotel not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Hotel with the specified ID does not exist",
              },
            ],
          })
        );
      }

      hotel.ratings.push({
        ...ratingData,
        createdAt: new Date(),
      });

      await hotel.save();

      return {
        status: "success",
        data: hotel,
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to add rating",
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
   * Get room availability for a hotel
   * @throws {Error} 404 - Hotel not found
   */
  async getRoomAvailability(
    id: string,
    params: {
      checkIn: Date;
      checkOut: Date;
      guests: number;
    }
  ) {
    try {
      const hotel = await Hotel.findById(id);
      if (!hotel) {
        throw new Error(
          JSON.stringify({
            message: "Hotel not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Hotel with the specified ID does not exist",
              },
            ],
          })
        );
      }

      // Check if dates are valid
      const checkInDate = new Date(params.checkIn);
      const checkOutDate = new Date(params.checkOut);

      if (checkInDate >= checkOutDate) {
        throw new Error(
          JSON.stringify({
            message: "Invalid dates",
            errors: [
              {
                type: "ValidationError",
                path: ["dates"],
                message: "Check-in date must be before check-out date",
              },
            ],
          })
        );
      }

      // Get existing bookings for this period
      const existingBookings = await Booking.find({
        hotelId: id,
        $or: [
          {
            checkIn: { $lte: checkOutDate },
            checkOut: { $gte: checkInDate },
          },
        ],
      });

      // Get booked room IDs for this period
      const bookedRoomIds = existingBookings.map((booking) =>
        booking.roomId.toString()
      );

      // Filter available rooms based on capacity, maintenance status and existing bookings
      const availableRooms = hotel.rooms.filter(
        (room) =>
          room.isAvailable &&
          room.maintenanceStatus === "Available" &&
          room.capacity >= params.guests &&
          !bookedRoomIds.includes(room._id.toString())
      );

      // Calculate prices including seasonal adjustments
      const roomsWithPrices = availableRooms.map((room) => {
        const basePrice = room.pricePerNight;
        const totalNights = Math.ceil(
          (checkOutDate.getTime() - checkInDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        const seasonalPrice = hotel.getCurrentPrice(room.roomType, checkInDate);

        return {
          ...room.toObject(),
          calculatedPrice: {
            basePrice,
            seasonalPrice,
            totalPrice: seasonalPrice * totalNights,
          },
        };
      });

      return {
        status: "success",
        data: {
          availableRooms: roomsWithPrices,
          totalRooms: roomsWithPrices.length,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights: Math.ceil(
            (checkOutDate.getTime() - checkInDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        },
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to get room availability",
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
   * Add user review to hotel
   * @throws {Error} 404 - Hotel not found
   * @throws {Error} 400 - Invalid review data
   */
  async addUserReview(
    id: string,
    reviewData: {
      userId: string;
      rating: number;
      comment: string;
    }
  ) {
    try {
      const hotel = await Hotel.findById(id);
      if (!hotel) {
        throw new Error(
          JSON.stringify({
            message: "Hotel not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Hotel with the specified ID does not exist",
              },
            ],
          })
        );
      }

      // Validate rating
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error(
          JSON.stringify({
            message: "Invalid rating",
            errors: [
              {
                type: "ValidationError",
                path: ["rating"],
                message: "Rating must be between 1 and 5",
              },
            ],
          })
        );
      }

      hotel.ratings.push({
        ...reviewData,
        createdAt: new Date(),
      });

      await hotel.save();

      return {
        status: "success",
        data: hotel,
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to add review",
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
   * Get nearby hotels based on coordinates
   * @throws {Error} 400 - Invalid coordinates
   */
  async getNearbyHotels(params: {
    latitude: number;
    longitude: number;
    radius?: number; // in kilometers
    limit?: number;
  }) {
    try {
      const radius = params.radius || 10; // Default 10km
      const limit = params.limit || 10; // Default 10 results

      // Use MongoDB's geospatial query
      const hotels = await Hotel.find({
        "location.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [params.longitude, params.latitude],
            },
            $maxDistance: radius * 1000, // Convert km to meters
          },
        },
      }).limit(limit);

      return {
        status: "success",
        data: hotels,
      };
    } catch (error: any) {
      throw new Error(
        JSON.stringify({
          message: "Failed to find nearby hotels",
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

  // /**
  //  * Toggle hotel favorite status for a user
  //  * @throws {Error} 404 - Hotel not found
  //  */
  // async toggleFavorite(hotelId: string, userId: string) {
  //   const favoriteController = new FavoriteController();
  //   return favoriteController.toggleFavorite(hotelId, 'hotel', userId);
  // }

  /**
   * Book a room in the hotel
   * @throws {Error} 404 - Hotel not found
   * @throws {Error} 400 - Invalid booking data
   */
  async bookRoom(
    hotelId: string,
    bookingData: {
      userId: string;
      roomId: string;
      checkIn: Date;
      checkOut: Date;
      guests: number;
      // contactName: string;
      // contactEmail: string;
      // contactPhone: string;
    }
  ) {
    try {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        throw new Error(
          JSON.stringify({
            message: "Hotel not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["id"],
                message: "Hotel with the specified ID does not exist",
              },
            ],
          })
        );
      }

      const room = await Room.findById(bookingData.roomId);
      if (!room) {
        throw new Error(
          JSON.stringify({
            message: "Room not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["roomId"],
                message: "Room with the specified ID does not exist",
              },
            ],
          })
        );
      }

      if (!room.isAvailable) {
        throw new Error(
          JSON.stringify({
            message: "Room not available",
            errors: [
              {
                type: "ValidationError",
                path: ["roomId"],
                message: "The selected room is not available",
              },
            ],
          })
        );
      }

      if (room.capacity < bookingData.guests) {
        throw new Error(
          JSON.stringify({
            message: "Room capacity exceeded",
            errors: [
              {
                type: "ValidationError",
                path: ["guests"],
                message: `Room capacity is ${room.capacity} guests`,
              },
            ],
          })
        );
      }

      const user = await User.findById(bookingData.userId);

      // Generate booking reference
      const prefix = "H"; // H for hotel
      const date = new Date().toISOString().slice(2, 8).replace(/-/g, ""); // YYMMDD
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      const bookingReference = `${prefix}${date}${random}`;

      // Create booking (assuming we have a Booking model)
      const booking = new Booking({
        userId: bookingData.userId,
        bookingType: "hotel",
        bookingReference,
        startDate: bookingData.checkIn,
        endDate: bookingData.checkOut,
        hotelBooking: {
          hotelId: hotelId,
          roomIds: [bookingData.roomId],
          numberOfGuests: bookingData.guests,
        },
        pricing: {
          basePrice:
            room.pricePerNight *
            Math.ceil(
              (bookingData.checkOut.getTime() - bookingData.checkIn.getTime()) /
                (1000 * 60 * 60 * 24)
            ),
          taxes: room.pricePerNight * 0.1, // Assuming 10% tax
          totalPrice:
            room.pricePerNight *
            Math.ceil(
              (bookingData.checkOut.getTime() - bookingData.checkIn.getTime()) /
                (1000 * 60 * 60 * 24)
            ) *
            1.1, // Including tax
        },
        status: "Confirmed",
      });

      await booking.save();

      // Update room availability
      room.isAvailable = false;
      await hotel.save();

      return {
        status: "success",
        data: {
          booking,
          room,
        },
      };
    } catch (error: any) {
      if (error.message.startsWith("{")) {
        throw error;
      }
      throw new Error(
        JSON.stringify({
          message: "Failed to book room",
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
