import Room from "~/models/Room";
import Hotel from "~/models/Hotel";
import { error } from "elysia";
import { RoomInterface } from "~/utils/types";

export default class RoomController {
  /**
   * Retrieve all rooms with filtering options
   */
  async getRooms(query: any) {
    try {
      const {
        isAvailable,
        priceRange,
        roomType,
        capacity,
        page = 1,
        limit = 10,
      } = query;
      const filter: Record<string, any> = {};

      if (isAvailable !== undefined) {
        filter.isAvailable = isAvailable === "true";
      }

      if (priceRange) {
        const [min, max] = priceRange.split(",").map(Number);
        filter.pricePerNight = { $gte: min, $lte: max };
      }

      if (roomType) {
        filter.roomType = { $regex: roomType, $options: "i" };
      }

      if (capacity) {
        filter.capacity = { $gte: Number(capacity) };
      }

      const skipCount = (page - 1) * limit;
      const [rooms, totalCount] = await Promise.all([
        Room.find(filter)
          .populate("hotel", "name location")
          .skip(skipCount)
          .limit(limit),
        Room.countDocuments(filter),
      ]);

      return {
        success: true,
        data: rooms,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (err) {
      return error(500, {
        message: "Failed to retrieve rooms",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Get room by ID
   */
  async getRoomById(id: string) {
    try {
      const room = await Room.findById(id).populate(
        "hotel",
        "name location contactInfo"
      );

      if (!room) {
        return error(404, {
          message: "Room not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Room not found",
            },
          ],
        });
      }

      return {
        status: "success",
        data: room,
      };
    } catch (err) {
      return error(500, {
        message: "Failed to retrieve room",
        errors: [
          {
            type: "ServerError",
            path: ["id"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Create a new room
   */
  async createRoom(data: any) {
    try {
      // Verify that the hotel exists
      const hotel = await Hotel.findById(data.hotel);
      if (!hotel) {
        return error(404, {
          message: "Hotel not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["hotel"],
              message: "Hotel not found",
            },
          ],
        });
      }

      // Check if room number already exists for this hotel
      const existingRoom = await Room.findOne({
        hotel: data.hotel,
        roomNumber: data.roomNumber,
      });

      if (existingRoom) {
        return error(400, {
          message: "Room number already exists for this hotel",
          errors: [
            {
              type: "ValidationError",
              path: ["roomNumber"],
              message: "Room number already exists for this hotel",
            },
          ],
        });
      }

      const newRoom = new Room(data);
      const savedRoom = await newRoom.save();
      await savedRoom.populate("hotel", "name location");

      console.log(savedRoom);

      return {
        status: "success",
        data: savedRoom,
      };
    } catch (err) {
      console.log(err);

      return error(400, {
        message: "Failed to create room",
        errors: [
          {
            type: "ValidationError",
            path: [],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Update room by ID
   */
  async updateRoom(id: string, data: Partial<RoomInterface>) {
    try {
      const room = await Room.findById(id);

      if (!room) {
        return error(404, {
          message: "Room not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Room not found",
            },
          ],
        });
      }

      // If room number is being updated, check for conflicts
      if (data.roomNumber && data.roomNumber !== room.roomNumber) {
        const existingRoom = await Room.findOne({
          hotel: room.hotel,
          roomNumber: data.roomNumber,
          _id: { $ne: id },
        });

        if (existingRoom) {
          return error(400, {
            message: "Room number already exists for this hotel",
            errors: [
              {
                type: "ValidationError",
                path: ["roomNumber"],
                message: "Room number already exists for this hotel",
              },
            ],
          });
        }
      }

      const updatedRoom = await Room.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).populate("hotel", "name location");

      return {
        status: "success",
        data: updatedRoom,
      };
    } catch (err) {
      return error(400, {
        message: "Failed to update room",
        errors: [
          {
            type: "ValidationError",
            path: [],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Delete room by ID
   */
  async deleteRoom(id: string) {
    try {
      const room = await Room.findByIdAndDelete(id);

      if (!room) {
        return error(404, {
          message: "Room not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Room not found",
            },
          ],
        });
      }

      return {
        status: "success",
        message: "Room deleted successfully",
      };
    } catch (err) {
      return error(500, {
        message: "Failed to delete room",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Retrieve all rooms for a specific hotel with filtering options
   */
  async getRoomsByHotelId(hotelId: string, query: any) {
    try {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        return error(404, {
          message: "Hotel not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["hotelId"],
              message: "Hotel not found",
            },
          ],
        });
      }

      const {
        isAvailable,
        priceRange,
        roomType,
        capacity,
        page = 1,
        limit = 10,
      } = query;
      const filter: Record<string, any> = { hotel: hotelId };

      if (isAvailable !== undefined) {
        filter.isAvailable = isAvailable === "true";
      }

      if (priceRange) {
        const [min, max] = priceRange.split(",").map(Number);
        filter.pricePerNight = { $gte: min, $lte: max };
      }

      if (roomType) {
        filter.roomType = { $regex: roomType, $options: "i" };
      }

      if (capacity) {
        filter.capacity = { $gte: Number(capacity) };
      }

      const skipCount = (page - 1) * limit;
      const [rooms, totalCount] = await Promise.all([
        Room.find(filter).skip(skipCount).limit(limit),
        Room.countDocuments(filter),
      ]);

      return {
        success: true,
        data: rooms,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (err) {
      return error(500, {
        message: "Failed to retrieve hotel rooms",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Update room availability status
   */
  async updateRoomAvailability(id: string, isAvailable: boolean) {
    try {
      const room = await Room.findById(id);

      if (!room) {
        return error(404, {
          message: "Room not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["id"],
              message: "Room not found",
            },
          ],
        });
      }

      const updatedRoom = await Room.findByIdAndUpdate(
        id,
        {
          $set: {
            isAvailable,
            maintenanceStatus: isAvailable ? "Available" : "Maintenance",
          },
        },
        { new: true }
      ).populate("hotel", "name location");

      return {
        status: "success",
        data: updatedRoom,
      };
    } catch (err) {
      return error(500, {
        message: "Failed to update room availability",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Get room statistics for a hotel
   */
  async getRoomStats(hotelId: string) {
    try {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        return error(404, {
          message: "Hotel not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["hotelId"],
              message: "Hotel not found",
            },
          ],
        });
      }

      const [
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        roomsByType,
        averagePrice,
      ] = await Promise.all([
        Room.countDocuments({ hotel: hotelId }),
        Room.countDocuments({
          hotel: hotelId,
          isAvailable: true,
          maintenanceStatus: "Available",
        }),
        Room.countDocuments({ hotel: hotelId, isAvailable: false }),
        Room.countDocuments({
          hotel: hotelId,
          maintenanceStatus: { $ne: "Available" },
        }),
        Room.aggregate([
          { $match: { hotel: hotelId } },
          { $group: { _id: "$roomType", count: { $sum: 1 } } },
        ]),
        Room.aggregate([
          { $match: { hotel: hotelId } },
          { $group: { _id: null, avgPrice: { $avg: "$pricePerNight" } } },
        ]),
      ]);

      return {
        status: "success",
        data: {
          totalRooms,
          availableRooms,
          occupiedRooms,
          maintenanceRooms,
          roomsByType: roomsByType.reduce(
            (acc, curr) => ({
              ...acc,
              [curr._id]: curr.count,
            }),
            {}
          ),
          averagePrice: averagePrice[0]?.avgPrice || 0,
        },
      };
    } catch (err) {
      return error(500, {
        message: "Failed to retrieve room statistics",
        errors: [
          {
            type: "ServerError",
            path: ["server"],
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }
}
