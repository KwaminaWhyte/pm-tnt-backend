import { Schema } from "mongoose";

export interface OTP {
  code: string;
  expiresAt: Date;
}

export interface SmsInterface {
  phone: string;
  from: string;
  message: string;
  isSent: boolean;
}

export interface EmailInterface {
  email: string;
  subject: string;
  body: string;
  isSent: boolean;
}

export interface UserDeviceInterface {
  user: UserInterface;
  deviceToken: string;
  deviceType: string;
  deviceName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInterface {
  firstName: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone: string;
  position?: string;
  photo?: string;
  otp?: OTP;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginWithEmailDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface LoginWithPhoneDTO {
  phone: string;
}

export interface VerifyOtpDTO {
  phone: string;
  otp: string;
}

export interface LocationInterface {
  address: string;
  city: string;
  country: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface RatingInterface {
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface HotelInterface {
  name: string;
  description: string;
  location: LocationInterface;
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  starRating: number;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  rooms: Array<{
    roomNumber: string;
    floor: number;
    roomType: string;
    pricePerNight: number;
    capacity: number;
    features: string[];
    isAvailable: boolean;
    maintenanceStatus: "Available" | "Cleaning" | "Maintenance";
    images: string[];
  }>;
  images: string[];
  ratings: RatingInterface[];
  policies: {
    checkIn: string;
    checkOut: string;
    cancellation: string;
    payment: string;
    houseRules: string[];
  };
  seasonalPrices: Array<{
    startDate: Date;
    endDate: Date;
    multiplier: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleInterface {
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  details: {
    color: string;
    licensePlate: string;
    transmission: "Automatic" | "Manual";
    fuelType: "Petrol" | "Diesel" | "Electric" | "Hybrid";
    mileage: number;
    vin: string;
    insurance: {
      provider: string;
      policyNumber: string;
      expiryDate: Date;
      coverage: string;
    };
  };
  features: string[];
  capacity: number;
  pricePerDay: number;
  availability: {
    isAvailable: boolean;
    location: {
      city: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
  };
  maintenance: {
    lastService: Date;
    nextService: Date;
    status: "Available" | "In Service" | "Repairs Needed";
    history: Array<{
      date: Date;
      type: string;
      description: string;
      cost: number;
    }>;
  };
  rentalTerms: {
    minimumAge: number;
    requiredDocuments: string[];
    securityDeposit: number;
    mileageLimit: number;
    additionalDrivers: boolean;
    insuranceOptions: Array<{
      type: string;
      coverage: string;
      pricePerDay: number;
    }>;
  };
  ratings: RatingInterface[];
  images: string[];
  policies: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHotelDTO {
  name: string;
  description: string;
  location: LocationInterface;
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  starRating: number;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  rooms: Array<{
    roomNumber: string;
    floor: number;
    roomType: string;
    pricePerNight: number;
    capacity: number;
    features: string[];
    images: string[];
  }>;
  images: string[];
  policies: {
    checkIn: string;
    checkOut: string;
    cancellation: string;
    payment: string;
    houseRules: string[];
  };
}

export interface CreateVehicleDTO {
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  details: {
    color: string;
    licensePlate: string;
    transmission: "Automatic" | "Manual";
    fuelType: "Petrol" | "Diesel" | "Electric" | "Hybrid";
    mileage: number;
    vin: string;
    insurance: {
      provider: string;
      policyNumber: string;
      expiryDate: string;
      coverage: string;
    };
  };
  features: string[];
  capacity: number;
  pricePerDay: number;
  city?: string;
  country?: string;
  location: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  rentalTerms: {
    minimumAge: number;
    requiredDocuments: string[];
    securityDeposit: number;
    mileageLimit: number;
    additionalDrivers: boolean;
    insuranceOptions: Array<{
      type: string;
      coverage: string;
      pricePerDay: number;
    }>;
  };
  images: string[];
  policies: string;
}

export interface UpdateHotelDTO extends Partial<Omit<CreateHotelDTO, "rooms">> {
  rooms?: Array<{
    roomNumber: string;
    isAvailable?: boolean;
    maintenanceStatus?: "Available" | "Cleaning" | "Maintenance";
    pricePerNight?: number;
  }>;
}

export interface UpdateVehicleDTO extends Partial<CreateVehicleDTO> {
  city?: string;
  country?: string;
  "availability.isAvailable"?: boolean;
  "maintenance.status"?: "Available" | "In Service" | "Repairs Needed";
}

export interface VehicleSearchParams {
  page?: number;
  limit?: number;
  vehicleType?: string;
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "pricePerDay" | "capacity" | "rating";
  sortOrder?: "asc" | "desc";
}

export interface VehicleRatingDTO {
  rating: number;
  comment?: string;
}

export interface BookingInterface {
  user: UserInterface;
  hotel?: string;
  vehicle?: string;
  travelPackage?: string;
  bookingReference: string;
  bookingType: "hotel" | "vehicle" | "package";
  bookingDate: Date;
  startDate: Date;
  endDate: Date;
  bookingDetails: {
    // Hotel specific
    roomIds?: string[];
    numberOfGuests?: number;
    specialRequests?: string;

    // Vehicle specific
    pickupLocation?: {
      address: string;
      city: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    dropoffLocation?: {
      address: string;
      city: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    driverDetails?: {
      licenseNumber: string;
      expiryDate: Date;
    };
  };
  pricing: {
    basePrice: number;
    taxes: number;
    fees: Array<{
      name: string;
      amount: number;
    }>;
    discounts: Array<{
      type: string;
      amount: number;
    }>;
    totalPrice: number;
  };
  payment: {
    method?: "Credit Card" | "Debit Card" | "PayPal" | "Bank Transfer";
    transactionId?: string;
    paidAmount?: number;
    paidAt?: Date;
    refundStatus: "None" | "Pending" | "Refunded" | "Denied";
  };
  status: "Pending" | "Confirmed" | "Cancelled";
  paymentStatus: "Paid" | "Partially Paid" | "Unpaid" | "Refunded";
  cancellation?: {
    cancelledAt: Date;
    reason: string;
    refundAmount?: number;
    cancellationFee?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingDTO {
  // Required fields
  startDate: string;
  endDate: string;
  bookingType?: "hotel" | "vehicle" | "package";
  bookingDetails: {
    numberOfGuests?: number;
    specialRequests?: string;
    pickupLocation?: {
      address: string;
      city: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    dropoffLocation?: {
      address: string;
      city: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    driverDetails?: {
      licenseNumber: string;
      expiryDate: string;
    };
  };

  // Optional service selections (at least one required)
  hotelId?: string;
  roomIds?: string[];
  vehicleId?: string;
  packageId?: string;

  // Optional pricing information
  pricing?: {
    basePrice: number;
    taxes: number;
    fees?: Array<{
      name: string;
      amount: number;
    }>;
    discounts?: Array<{
      type: string;
      amount: number;
    }>;
    totalPrice: number;
  };
}

export interface UpdateBookingDTO {
  startDate?: string;
  endDate?: string;
  bookingDetails?: {
    numberOfGuests?: number;
    specialRequests?: string;
    pickupLocation?: {
      address: string;
      city: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    dropoffLocation?: {
      address: string;
      city: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
  };
  status?: "Pending" | "Confirmed" | "Cancelled";
  paymentStatus?: "Paid" | "Partially Paid" | "Unpaid" | "Refunded";
}

export interface BookingSearchParams {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  paymentStatus?: "Paid" | "Partially Paid" | "Unpaid" | "Refunded";
  serviceType?: "hotel" | "vehicle" | "package";
  bookingType?: "hotel" | "vehicle" | "package" | "all" | string;
  location?: string;
  sortBy?: "bookingDate" | "startDate" | "totalPrice" | "status";
  sortOrder?: "asc" | "desc";
}

export interface BookingPricingResponse {
  basePrice: number;
  taxes: number;
  fees: Array<{
    name: string;
    amount: number;
  }>;
  discounts: Array<{
    type: string;
    amount: number;
  }>;
  totalPrice: number;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    type?: string;
  }>;
  timestamp: string;
}

export interface DestinationInterface {
  name: string;
  country: string;
  city: string;
  description: string;
  highlights: string[];
  price: number;
  discount?: number;
  images: string[];
  location: {
    type: string;
    coordinates: number[];
  };
  bestTimeToVisit: {
    startMonth: number;
    endMonth: number;
  };
  climate: "Tropical" | "Dry" | "Temperate" | "Continental" | "Polar";
  popularActivities: string[];
  localCuisine: string[];
  culturalEvents: Array<{
    name: string;
    description: string;
    date?: {
      month: number;
      day?: number;
    };
  }>;
  relatedDestinations: Array<{
    destinationId: Schema.Types.ObjectId;
    relationshipType: "NearBy" | "SimilarClimate" | "PopularCombination";
  }>;
  seasonalPricing: Array<{
    startMonth: number;
    endMonth: number;
    priceMultiplier: number;
  }>;
  travelTips: string[];
  visaRequirements?: string;
  languages: string[];
  currency: string;
  timeZone: string;
  status: "Active" | "Inactive" | "Seasonal";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
