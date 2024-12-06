import { error } from "elysia";
import Trip, { TripInterface } from "../models/Trip";
import Hotel from "../models/Hotel";
import Vehicle from "../models/Vehicle";
import Destination from "../models/Destination";

interface CreateTripDTO {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  destinations: Array<{
    destinationId: string;
    order: number;
    stayDuration: number;
  }>;
  budget: {
    total: number;
  };
}

interface UpdateTripDTO {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: 'Draft' | 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
  notes?: string;
}

interface AddAccommodationDTO {
  hotelId: string;
  roomIds: string[];
  checkIn: string;
  checkOut: string;
  specialRequests?: string;
}

interface AddTransportationDTO {
  vehicleId?: string;
  type: 'Flight' | 'Train' | 'Bus' | 'RentalCar' | 'Own';
  details: {
    from: string;
    to: string;
    departureTime?: string;
    arrivalTime?: string;
    bookingReference?: string;
  };
}

interface AddActivityDTO {
  name: string;
  description?: string;
  location: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  date: string;
  duration: number;
  cost: number;
}

interface AddMealDTO {
  type: 'Breakfast' | 'Lunch' | 'Dinner';
  date: string;
  venue?: string;
  isIncluded: boolean;
  preferences?: string[];
}

export default class TripController {
  /**
   * Create a new trip
   */
  async createTrip(userId: string, data: CreateTripDTO) {
    try {
      // Validate dates
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (startDate >= endDate) {
        return error(400, {
          message: "Invalid date range",
          errors: [
            {
              type: "ValidationError",
              path: ["startDate", "endDate"],
              message: "Start date must be before end date",
            },
          ],
        });
      }

      // Validate destinations exist
      for (const dest of data.destinations) {
        const destination = await Destination.findById(dest.destinationId);
        if (!destination) {
          return error(404, {
            message: "Destination not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["destinations"],
                message: `Destination with ID ${dest.destinationId} not found`,
              },
            ],
          });
        }
      }

      const trip = await Trip.create({
        ...data,
        userId,
        budget: {
          ...data.budget,
          spent: {
            accommodation: 0,
            transportation: 0,
            activities: 0,
            meals: 0,
            others: 0,
          },
          remaining: data.budget.total,
        },
      });

      return {
        success: true,
        data: trip,
      };
    } catch (err) {
      console.error("Error creating trip:", err);
      throw error(500, {
        message: "Failed to create trip",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Get all trips for a user
   */
  async getTrips(userId: string, {
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate,
  }: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const filter: Record<string, any> = { userId };

      if (status) {
        filter.status = status;
      }

      if (startDate) {
        filter.startDate = { $gte: new Date(startDate) };
      }

      if (endDate) {
        filter.endDate = { $lte: new Date(endDate) };
      }

      const [trips, totalCount] = await Promise.all([
        Trip.find(filter)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ startDate: 1 })
          .populate('destinations.destinationId')
          .exec(),
        Trip.countDocuments(filter),
      ]);

      return {
        success: true,
        data: trips,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      };
    } catch (err) {
      console.error("Error fetching trips:", err);
      throw error(500, {
        message: "Failed to fetch trips",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Get a single trip by ID
   */
  async getTrip(userId: string, tripId: string) {
    try {
      const trip = await Trip.findOne({ _id: tripId, userId })
        .populate('destinations.destinationId')
        .populate('accommodations.hotelId')
        .populate('transportation.vehicleId')
        .exec();

      if (!trip) {
        return error(404, {
          message: "Trip not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["tripId"],
              message: "Trip not found",
            },
          ],
        });
      }

      return {
        success: true,
        data: trip,
      };
    } catch (err) {
      console.error("Error fetching trip:", err);
      throw error(500, {
        message: "Failed to fetch trip",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Update a trip
   */
  async updateTrip(userId: string, tripId: string, data: UpdateTripDTO) {
    try {
      const trip = await Trip.findOne({ _id: tripId, userId });

      if (!trip) {
        return error(404, {
          message: "Trip not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["tripId"],
              message: "Trip not found",
            },
          ],
        });
      }

      if (data.startDate && data.endDate) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (startDate >= endDate) {
          return error(400, {
            message: "Invalid date range",
            errors: [
              {
                type: "ValidationError",
                path: ["startDate", "endDate"],
                message: "Start date must be before end date",
              },
            ],
          });
        }
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        { $set: data },
        { new: true }
      )
        .populate('destinations.destinationId')
        .populate('accommodations.hotelId')
        .populate('transportation.vehicleId');

      return {
        success: true,
        data: updatedTrip,
      };
    } catch (err) {
      console.error("Error updating trip:", err);
      throw error(500, {
        message: "Failed to update trip",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Add accommodation to a trip
   */
  async addAccommodation(userId: string, tripId: string, data: AddAccommodationDTO) {
    try {
      const trip = await Trip.findOne({ _id: tripId, userId });

      if (!trip) {
        return error(404, {
          message: "Trip not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["tripId"],
              message: "Trip not found",
            },
          ],
        });
      }

      // Validate hotel exists
      const hotel = await Hotel.findById(data.hotelId);
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

      // Validate room IDs
      for (const roomId of data.roomIds) {
        const room = hotel.rooms.find(r => r._id.toString() === roomId);
        if (!room) {
          return error(404, {
            message: "Room not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["roomIds"],
                message: `Room with ID ${roomId} not found`,
              },
            ],
          });
        }
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $push: {
            accommodations: {
              hotelId: data.hotelId,
              roomIds: data.roomIds,
              checkIn: new Date(data.checkIn),
              checkOut: new Date(data.checkOut),
              specialRequests: data.specialRequests,
            },
          },
        },
        { new: true }
      ).populate('accommodations.hotelId');

      return {
        success: true,
        data: updatedTrip,
      };
    } catch (err) {
      console.error("Error adding accommodation:", err);
      throw error(500, {
        message: "Failed to add accommodation",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Add transportation to a trip
   */
  async addTransportation(userId: string, tripId: string, data: AddTransportationDTO) {
    try {
      const trip = await Trip.findOne({ _id: tripId, userId });

      if (!trip) {
        return error(404, {
          message: "Trip not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["tripId"],
              message: "Trip not found",
            },
          ],
        });
      }

      // If vehicleId is provided, validate it exists
      if (data.vehicleId) {
        const vehicle = await Vehicle.findById(data.vehicleId);
        if (!vehicle) {
          return error(404, {
            message: "Vehicle not found",
            errors: [
              {
                type: "NotFoundError",
                path: ["vehicleId"],
                message: "Vehicle not found",
              },
            ],
          });
        }
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $push: {
            transportation: {
              vehicleId: data.vehicleId,
              type: data.type,
              details: {
                from: data.details.from,
                to: data.details.to,
                departureTime: data.details.departureTime ? new Date(data.details.departureTime) : undefined,
                arrivalTime: data.details.arrivalTime ? new Date(data.details.arrivalTime) : undefined,
                bookingReference: data.details.bookingReference,
              },
            },
          },
        },
        { new: true }
      ).populate('transportation.vehicleId');

      return {
        success: true,
        data: updatedTrip,
      };
    } catch (err) {
      console.error("Error adding transportation:", err);
      throw error(500, {
        message: "Failed to add transportation",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Add activity to a trip
   */
  async addActivity(userId: string, tripId: string, data: AddActivityDTO) {
    try {
      const trip = await Trip.findOne({ _id: tripId, userId });

      if (!trip) {
        return error(404, {
          message: "Trip not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["tripId"],
              message: "Trip not found",
            },
          ],
        });
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $push: {
            activities: {
              ...data,
              date: new Date(data.date),
            },
          },
          $inc: {
            'budget.spent.activities': data.cost,
            'budget.remaining': -data.cost,
          },
        },
        { new: true }
      );

      return {
        success: true,
        data: updatedTrip,
      };
    } catch (err) {
      console.error("Error adding activity:", err);
      throw error(500, {
        message: "Failed to add activity",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Add meal to a trip
   */
  async addMeal(userId: string, tripId: string, data: AddMealDTO) {
    try {
      const trip = await Trip.findOne({ _id: tripId, userId });

      if (!trip) {
        return error(404, {
          message: "Trip not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["tripId"],
              message: "Trip not found",
            },
          ],
        });
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $push: {
            meals: {
              ...data,
              date: new Date(data.date),
            },
          },
        },
        { new: true }
      );

      return {
        success: true,
        data: updatedTrip,
      };
    } catch (err) {
      console.error("Error adding meal:", err);
      throw error(500, {
        message: "Failed to add meal",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }

  /**
   * Delete a trip
   */
  async deleteTrip(userId: string, tripId: string) {
    try {
      const trip = await Trip.findOne({ _id: tripId, userId });

      if (!trip) {
        return error(404, {
          message: "Trip not found",
          errors: [
            {
              type: "NotFoundError",
              path: ["tripId"],
              message: "Trip not found",
            },
          ],
        });
      }

      await Trip.findByIdAndDelete(tripId);

      return {
        success: true,
        message: "Trip deleted successfully",
      };
    } catch (err) {
      console.error("Error deleting trip:", err);
      throw error(500, {
        message: "Failed to delete trip",
        errors: [
          {
            type: "ServerError",
            message: err instanceof Error ? err.message : "Unknown error occurred",
          },
        ],
      });
    }
  }
}
