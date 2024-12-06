import { Request, Response } from "express";
import Room from "../models/Room";

export default class RoomController {
  /**
   * Retrieve all rooms with filtering options
   */
  async getRooms(req: Request, res: Response) {
    try {
      const { isAvailable, priceRange, roomType, capacity } = req.query;
      const filter: Record<string, any> = {};

      if (isAvailable !== undefined) {
        filter.isAvailable = isAvailable === 'true';
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
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving rooms", error });
    }
  }

  /**
   * Create a new room
   */
  async createRoom(req: Request, res: Response) {
    try {
      const newRoom = new Room(req.body);
      await newRoom.save();
      res.status(201).json(newRoom);
    } catch (error) {
      res.status(500).json({ message: "Error creating room", error });
    }
  }
}
