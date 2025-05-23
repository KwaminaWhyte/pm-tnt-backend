import mongoose, { type Model, Schema, Document } from "mongoose";

/**
 * Location Schema Interface - Represents a physical location with geo coordinates
 */
interface LocationInterface {
  address: string;
  city: string;
  country: string;
  geo: {
    type: string;
    coordinates: number[];
  };
}

/**
 * Rating Schema Interface - Represents a user rating for a hotel
 */
interface RatingInterface {
  userId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact Info Interface - Represents contact information for a hotel
 */
interface ContactInfoInterface {
  phone?: string;
  email?: string;
  website?: string;
}

/**
 * Policy Interface - Represents hotel policies
 */
interface PolicyInterface {
  checkIn?: string;
  checkOut?: string;
  cancellation?: string;
  payment?: string;
  houseRules?: string[];
}

/**
 * Seasonal Price Interface - Represents seasonal pricing for a hotel
 */
interface SeasonalPriceInterface {
  startDate: Date;
  endDate: Date;
  multiplier: number;
}

/**
 * Room Interface - Represents a hotel room
 */
interface RoomInterface {
  roomNumber: string;
  floor?: number;
  roomType: string;
  pricePerNight: number;
  capacity: number;
  features: string[];
  isAvailable: boolean;
  maintenanceStatus: "Available" | "Cleaning" | "Maintenance";
  images: string[];
  description?: string;
  size?: number;
  bedType?: string;
}

/**
 * Hotel Interface - Represents a hotel in the system
 */
export interface HotelInterface extends Document {
  name: string;
  description?: string;
  shortDescription?: string;
  location: LocationInterface;
  contactInfo: ContactInfoInterface;
  starRating: number;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  images: string[];
  featuredImage?: string;
  ratings: RatingInterface[];
  policies: PolicyInterface;
  seasonalPrices: SeasonalPriceInterface[];
  rooms?: RoomInterface[];
  isAvailable: boolean;
  isPopular?: boolean;
  popularity?: number;
  averageRating?: number;
  reviewCount?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getCurrentPrice(date?: Date): number;
  getAvailableRooms(checkIn: Date, checkOut: Date): Promise<RoomInterface[]>;
  addRating(
    userId: mongoose.Types.ObjectId,
    rating: number,
    comment?: string
  ): Promise<HotelInterface>;
}

/**
 * Location Schema - Represents a physical location with geo coordinates
 */
const locationSchema = new Schema(
  {
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [200, "Address cannot exceed 200 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
      index: true,
    },
    geo: {
      type: {
        type: String,
        enum: {
          values: ["Point"],
          message: "{VALUE} is not a valid geo type",
        },
        required: [true, "Geo type is required"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: [true, "Coordinates are required"],
        validate: {
          validator: function (v: number[]) {
            return (
              v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 && // longitude
              v[1] >= -90 &&
              v[1] <= 90 // latitude
            );
          },
          message:
            "Coordinates must be [longitude, latitude] and within valid ranges",
        },
      },
    },
  },
  { _id: false }
);

/**
 * Room Schema - Represents a hotel room
 */
const roomSchema = new Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      trim: true,
      index: true,
    },
    floor: {
      type: Number,
      min: [0, "Floor number cannot be negative"],
    },
    roomType: {
      type: String,
      required: [true, "Room type is required"],
      trim: true,
      enum: {
        values: ["Single", "Double", "Twin", "Suite", "Deluxe", "Presidential"],
        message: "{VALUE} is not a valid room type",
      },
      index: true,
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0, "Price cannot be negative"],
      index: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [20, "Capacity cannot exceed 20"],
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    maintenanceStatus: {
      type: String,
      enum: {
        values: ["Available", "Cleaning", "Maintenance"],
        message: "{VALUE} is not a valid maintenance status",
      },
      default: "Available",
      index: true,
    },
    images: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string) {
            return /^https?:\/\/.+/.test(v);
          },
          message: "Image URL must be a valid URL",
        },
      },
    ],
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    size: {
      type: Number,
      min: [0, "Size cannot be negative"],
    },
    bedType: {
      type: String,
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

/**
 * Rating Schema - Represents a user rating for a hotel
 */
const ratingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
  },
  { _id: true, timestamps: true }
);

/**
 * Hotel Schema - Represents a hotel in the system
 *
 * @remarks
 * Hotels have location, amenities, ratings, and seasonal pricing
 */
const hotelSchema = new Schema<HotelInterface>(
  {
    name: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
      index: true,
      maxlength: [100, "Hotel name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },
    location: {
      type: locationSchema,
      required: [true, "Location is required"],
    },
    contactInfo: {
      phone: {
        type: String,
        trim: true,
        match: [/^\+?[0-9]\d{1,14}$/, "Invalid phone number format"],
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email format"],
      },
      website: {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: "Website must be a valid URL",
        },
      },
    },
    starRating: {
      type: Number,
      required: [true, "Star rating is required"],
      min: [1, "Star rating must be at least 1"],
      max: [5, "Star rating cannot exceed 5"],
      index: true,
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    checkInTime: {
      type: String,
      required: [true, "Check-in time is required"],
      trim: true,
    },
    checkOutTime: {
      type: String,
      required: [true, "Check-out time is required"],
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string) {
            return /^https?:\/\/.+/.test(v);
          },
          message: "Image URL must be a valid URL",
        },
      },
    ],
    featuredImage: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Featured image must be a valid URL",
      },
    },
    ratings: [ratingSchema],
    policies: {
      checkIn: {
        type: String,
        trim: true,
        maxlength: [500, "Check-in policy cannot exceed 500 characters"],
      },
      checkOut: {
        type: String,
        trim: true,
        maxlength: [500, "Check-out policy cannot exceed 500 characters"],
      },
      cancellation: {
        type: String,
        trim: true,
        maxlength: [1000, "Cancellation policy cannot exceed 1000 characters"],
      },
      payment: {
        type: String,
        trim: true,
        maxlength: [1000, "Payment policy cannot exceed 1000 characters"],
      },
      houseRules: [
        {
          type: String,
          trim: true,
          maxlength: [500, "House rule cannot exceed 500 characters"],
        },
      ],
    },
    seasonalPrices: [
      {
        startDate: {
          type: Date,
          required: [true, "Start date is required"],
          validate: {
            validator: function (this: any, v: Date) {
              // If this is an update and endDate exists, validate that startDate is before endDate
              if (this.endDate && v > this.endDate) {
                return false;
              }
              return true;
            },
            message: "Start date must be before end date",
          },
        },
        endDate: {
          type: Date,
          required: [true, "End date is required"],
          validate: {
            validator: function (this: any, v: Date) {
              // If this is an update and startDate exists, validate that endDate is after startDate
              if (this.startDate && v < this.startDate) {
                return false;
              }
              return true;
            },
            message: "End date must be after start date",
          },
        },
        multiplier: {
          type: Number,
          required: [true, "Price multiplier is required"],
          min: [0, "Multiplier must be non-negative"],
          max: [10, "Multiplier cannot exceed 10"],
        },
      },
    ],
    rooms: [roomSchema],
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
      index: true,
    },
    popularity: {
      type: Number,
      default: 0,
      min: [0, "Popularity must be non-negative"],
      max: [10, "Popularity cannot exceed 10"],
      index: true,
    },
    priceRange: {
      min: {
        type: Number,
        min: [0, "Minimum price must be non-negative"],
      },
      max: {
        type: Number,
        min: [0, "Maximum price must be non-negative"],
      },
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count must be non-negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
hotelSchema.index({ "location.geo": "2dsphere" });
hotelSchema.index(
  {
    name: "text",
    description: "text",
    "location.city": "text",
    "location.country": "text",
  },
  {
    weights: {
      name: 10,
      description: 5,
      "location.city": 5,
      "location.country": 1,
    },
  }
);
hotelSchema.index({ "priceRange.min": 1 });

// Virtuals
hotelSchema.virtual("averageRating").get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

hotelSchema.virtual("hasRooms").get(function () {
  return this.rooms && this.rooms.length > 0;
});

hotelSchema.virtual("availableRoomCount").get(function () {
  if (!this.rooms) return 0;
  return this.rooms.filter((room) => room.isAvailable).length;
});

// Middleware
hotelSchema.pre("save", function (next) {
  // Validate seasonal prices don't overlap
  const prices = this.seasonalPrices;
  if (prices && prices.length > 0) {
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        if (
          (prices[i].startDate <= prices[j].endDate &&
            prices[i].endDate >= prices[j].startDate) ||
          (prices[j].startDate <= prices[i].endDate &&
            prices[j].endDate >= prices[i].startDate)
        ) {
          return next(new Error("Seasonal price periods cannot overlap"));
        }
      }
    }
  }

  // Update review count
  if (this.ratings) {
    this.reviewCount = this.ratings.length;
  }

  // Update price range if rooms exist
  if (this.rooms && this.rooms.length > 0) {
    const prices = this.rooms.map((room) => room.pricePerNight);
    this.priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  next();
});

/**
 * Get the current price multiplier based on seasonal pricing
 * @param date - The date to check (defaults to current date)
 * @returns The price multiplier (1 if no seasonal price applies)
 */
hotelSchema.methods.getCurrentPrice = function (
  date: Date = new Date()
): number {
  if (!this.seasonalPrices || this.seasonalPrices.length === 0) return 1;

  const seasonalPrice = this.seasonalPrices.find(
    (sp: { startDate: Date; endDate: Date; multiplier: number }) =>
      date >= sp.startDate && date <= sp.endDate
  );

  return seasonalPrice ? seasonalPrice.multiplier : 1;
};

/**
 * Get available rooms for a given date range
 * @param checkIn - Check-in date
 * @param checkOut - Check-out date
 * @returns Array of available rooms
 */
hotelSchema.methods.getAvailableRooms = async function (
  checkIn: Date,
  checkOut: Date
): Promise<RoomInterface[]> {
  if (!this.rooms || this.rooms.length === 0) return [];

  // In a real implementation, this would check bookings against the date range
  // For now, we'll just return rooms marked as available
  return this.rooms.filter(
    (room) => room.isAvailable && room.maintenanceStatus === "Available"
  );
};

/**
 * Add a rating to the hotel
 * @param userId - User ID of the reviewer
 * @param rating - Rating value (1-5)
 * @param comment - Optional comment
 * @returns Updated hotel document
 */
hotelSchema.methods.addRating = async function (
  userId: mongoose.Types.ObjectId,
  rating: number,
  comment?: string
): Promise<HotelInterface> {
  // Check if user has already rated this hotel
  const existingRatingIndex = this.ratings.findIndex(
    (r: any) => r.userId.toString() === userId.toString()
  );

  if (existingRatingIndex >= 0) {
    // Update existing rating
    this.ratings[existingRatingIndex].rating = rating;
    if (comment) {
      this.ratings[existingRatingIndex].comment = comment;
    }
  } else {
    // Add new rating
    this.ratings.push({
      userId,
      rating,
      comment,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Update review count
  this.reviewCount = this.ratings.length;

  return this.save();
};

// Statics

/**
 * Find hotels by city
 */
hotelSchema.statics.findByCity = async function (
  city: string
): Promise<HotelInterface[]> {
  return this.find({ "location.city": city, isAvailable: true }).sort({
    popularity: -1,
  });
};

/**
 * Find hotels by star rating
 */
hotelSchema.statics.findByStarRating = async function (
  rating: number
): Promise<HotelInterface[]> {
  return this.find({ starRating: rating, isAvailable: true }).sort({
    popularity: -1,
  });
};

/**
 * Find popular hotels
 */
hotelSchema.statics.findPopular = async function (
  limit: number = 10
): Promise<HotelInterface[]> {
  return this.find({ isAvailable: true })
    .sort({ popularity: -1, averageRating: -1 })
    .limit(limit);
};

// Create or retrieve the model
let Hotel: Model<HotelInterface>;
try {
  Hotel = mongoose.model<HotelInterface>("Hotel");
} catch (error) {
  Hotel = mongoose.model<HotelInterface>("Hotel", hotelSchema);
}

export default Hotel;
