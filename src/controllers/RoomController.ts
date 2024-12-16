import Room from "../models/Room";
import Hotel from "../models/Hotel";

export default class RoomController {
  /**
   * Retrieve all rooms with filtering options
   */
  async getRooms(query: any) {
    const { isAvailable, priceRange, roomType, capacity } = query;
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

    const rooms = await Room.find(filter);
    return rooms;
  }

  /**
   * Create a new room
   */
  async createRoom(data: any) {
    const newRoom = new Room(data);
    await newRoom.save();
    return newRoom;
  }

  /**
   * Retrieve all rooms for a specific hotel with filtering options
   */
  async getRoomsByHotelId(hotelId: string, query: any) {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      throw new Error(
        JSON.stringify({
          message: "Hotel not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["hotelId"],
              message: "Hotel not found",
            },
          ],
        })
      );
    }

    const { isAvailable, priceRange, roomType, capacity } = query;
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

    const rooms = await Room.find(filter);
    console.log({ filter, rooms });
    return rooms;
  }
}
