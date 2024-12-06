import { Schema } from "mongoose";
import mongoose from "../mongoose";

// Define interfaces for the trip components
interface TripAccommodation {
  hotelId: Schema.Types.ObjectId;
  roomIds: Schema.Types.ObjectId[];
  checkIn: Date;
  checkOut: Date;
  specialRequests?: string;
}

interface TripTransportation {
  vehicleId?: Schema.Types.ObjectId;
  type: 'Flight' | 'Train' | 'Bus' | 'RentalCar' | 'Own';
  details: {
    from: string;
    to: string;
    departureTime?: Date;
    arrivalTime?: Date;
    bookingReference?: string;
  };
}

interface TripActivity {
  name: string;
  description?: string;
  location: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  date: Date;
  duration: number; // in minutes
  cost: number;
}

interface TripMeal {
  type: 'Breakfast' | 'Lunch' | 'Dinner';
  date: Date;
  venue?: string;
  isIncluded: boolean;
  preferences?: string[];
}

export interface TripInterface {
  userId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  destinations: Array<{
    destinationId: Schema.Types.ObjectId;
    order: number;
    stayDuration: number; // in days
  }>;
  accommodations: TripAccommodation[];
  transportation: TripTransportation[];
  activities: TripActivity[];
  meals: TripMeal[];
  budget: {
    total: number;
    spent: {
      accommodation: number;
      transportation: number;
      activities: number;
      meals: number;
      others: number;
    };
    remaining: number;
  };
  status: 'Draft' | 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
  sharing: {
    isPublic: boolean;
    sharedWith: Schema.Types.ObjectId[]; // User IDs
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tripSchema = new Schema<TripInterface>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    destinations: [{
      destinationId: {
        type: Schema.Types.ObjectId,
        ref: 'destinations',
        required: true,
      },
      order: {
        type: Number,
        required: true,
      },
      stayDuration: {
        type: Number,
        required: true,
      },
    }],
    accommodations: [{
      hotelId: {
        type: Schema.Types.ObjectId,
        ref: 'hotels',
        required: true,
      },
      roomIds: [{
        type: Schema.Types.ObjectId,
        required: true,
      }],
      checkIn: {
        type: Date,
        required: true,
      },
      checkOut: {
        type: Date,
        required: true,
      },
      specialRequests: String,
    }],
    transportation: [{
      vehicleId: {
        type: Schema.Types.ObjectId,
        ref: 'vehicles',
      },
      type: {
        type: String,
        enum: ['Flight', 'Train', 'Bus', 'RentalCar', 'Own'],
        required: true,
      },
      details: {
        from: {
          type: String,
          required: true,
        },
        to: {
          type: String,
          required: true,
        },
        departureTime: Date,
        arrivalTime: Date,
        bookingReference: String,
      },
    }],
    activities: [{
      name: {
        type: String,
        required: true,
      },
      description: String,
      location: {
        name: {
          type: String,
          required: true,
        },
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
      },
      date: {
        type: Date,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      cost: {
        type: Number,
        required: true,
      },
    }],
    meals: [{
      type: {
        type: String,
        enum: ['Breakfast', 'Lunch', 'Dinner'],
        required: true,
      },
      date: {
        type: Date,
        required: true,
      },
      venue: String,
      isIncluded: {
        type: Boolean,
        default: false,
      },
      preferences: [String],
    }],
    budget: {
      total: {
        type: Number,
        required: true,
      },
      spent: {
        accommodation: {
          type: Number,
          default: 0,
        },
        transportation: {
          type: Number,
          default: 0,
        },
        activities: {
          type: Number,
          default: 0,
        },
        meals: {
          type: Number,
          default: 0,
        },
        others: {
          type: Number,
          default: 0,
        },
      },
      remaining: {
        type: Number,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['Draft', 'Planned', 'InProgress', 'Completed', 'Cancelled'],
      default: 'Draft',
    },
    sharing: {
      isPublic: {
        type: Boolean,
        default: false,
      },
      sharedWith: [{
        type: Schema.Types.ObjectId,
        ref: 'users',
      }],
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
tripSchema.index({ userId: 1, status: 1 });
tripSchema.index({ 'sharing.isPublic': 1 });
tripSchema.index({ startDate: 1, endDate: 1 });

let Trip: mongoose.Model<TripInterface>;
try {
  Trip = mongoose.model<TripInterface>('trips');
} catch (error) {
  Trip = mongoose.model<TripInterface>('trips', tripSchema);
}

export default Trip;