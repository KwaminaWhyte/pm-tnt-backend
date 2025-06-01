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
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
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

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  photo?: string;
}

export interface UserSearchParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: string;
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

export interface RoomInterface {
  hotel: string | Schema.Types.ObjectId; // Reference to Hotel
  roomNumber: string;
  floor: number;
  roomType: "Single" | "Double" | "Twin" | "Suite" | "Deluxe" | "Presidential";
  pricePerNight: number;
  capacity: number;
  features: string[];
  isAvailable: boolean;
  maintenanceStatus: "Available" | "Cleaning" | "Maintenance";
  images: string[];
  description?: string;
  size?: number; // in square meters/feet
  bedType?: string;
  createdAt: Date;
  updatedAt: Date;
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
  isAvailable: boolean;
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
  details?: {
    color: string;
    licensePlate: string;
    transmission: "Automatic" | "Manual";
    fuelType: "Petrol" | "Diesel" | "Electric" | "Hybrid";
    mileage: number;
    vin: string;
    insurance?: {
      provider: string;
      policyNumber: string;
      expiryDate: string | Date;
      coverage: string;
    };
  };
  // Individual fields for form submission
  color?: string;
  licensePlate?: string;
  transmission?: "Automatic" | "Manual";
  fuelType?: "Petrol" | "Diesel" | "Electric" | "Hybrid";
  mileage?: number;
  vin?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string | Date;
  insuranceCoverage?: string;

  features: string[];
  capacity: number;
  pricePerDay: number;

  // Location information
  city?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  location?: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Maintenance information
  maintenance?: {
    lastService: Date;
    nextService: Date;
    status?: "Available" | "In Service" | "Repairs Needed";
    history?: Array<{
      date: Date;
      type: string;
      description: string;
      cost: number;
    }>;
  };
  // Individual maintenance fields for form submission
  lastService?: string | Date;
  nextService?: string | Date;

  // Rental terms
  rentalTerms?: {
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
  minimumAge?: number;
  requiredDocuments?: string[];
  securityDeposit?: number;
  mileageLimit?: number;
  additionalDrivers?: boolean;
  insuranceOptions?: Array<{
    type: string;
    coverage: string;
    pricePerDay: number;
  }>;

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
  // Add all the flat fields for maintenance
  lastService?: string | Date;
  nextService?: string | Date;
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

/**
 * Package Interface - Represents a travel package in the system
 *
 * @remarks
 * Packages include destinations, hotels, activities, transportation, and itinerary details
 */
export interface PackageInterface {
  name: string;
  description?: string;
  price: number;
  basePrice: number; // Base price before any add-ons or seasonal adjustments
  images: string[];
  videos?: string[];
  duration: {
    days: number;
    nights: number;
  };
  destinations: Array<{
    destinationId: Schema.Types.ObjectId;
    order: number;
    stayDuration: number; // in days
  }>;
  hotels: Array<{
    hotelId: Schema.Types.ObjectId;
    roomTypes: string[];
    checkIn?: string;
    checkOut?: string;
  }>;
  accommodations?: Schema.Types.ObjectId[]; // Hotel IDs for accommodations
  activities: Array<{
    activityId: Schema.Types.ObjectId;
    day: number;
    timeSlot?: string;
  }>;
  transportation: {
    type: "Flight" | "Train" | "Bus" | "RentalCar" | "Mixed";
    details: Array<{
      vehicleId?: Schema.Types.ObjectId;
      type: string;
      from: string;
      to: string;
      day: number;
    }>;
  };
  itinerary: Array<{
    day: number;
    title: string;
    description: string;
    meals: {
      breakfast?: boolean;
      lunch?: boolean;
      dinner?: boolean;
    };
  }>;
  included: string[];
  excluded: string[];
  terms: string[];
  maxParticipants?: number;
  minParticipants?: number;
  spotsPerDay?: number; // Maximum number of bookings per day
  availability: {
    startDate?: Date; // Overall availability start
    endDate?: Date; // Overall availability end
    blackoutDates?: Date[]; // Dates when package is not available
    availableWeekdays?: number[]; // 0 = Sunday, 6 = Saturday
  };
  startDates?: Date[];
  seasonalPricing?: Array<{
    startDate: Date;
    endDate: Date;
    priceMultiplier: number;
  }>;
  weekendPricing?: {
    enabled: boolean;
    multiplier: number;
    weekendDays: number[]; // 0 = Sunday, 6 = Saturday
  };
  bookingPolicies: {
    minDaysBeforeBooking?: number;
    maxDaysInAdvance?: number;
    cancellationPolicy?: {
      fullRefundDays: number; // Number of days before for full refund
      partialRefundDays: number; // Number of days before for partial refund
      partialRefundPercentage: number; // Percentage for partial refund
    };
    paymentOptions?: {
      fullPayment: boolean;
      partialPayment: boolean;
      minDepositPercentage?: number;
    };
  };
  status: "Draft" | "Active" | "Inactive" | "SoldOut";
  sharing: {
    isPublic: boolean;
    sharedWith: Schema.Types.ObjectId[];
  };
  notes?: string;
  budget: {
    estimatedTotal: number;
    breakdown: {
      accommodation: number;
      transportation: number;
      activities: number;
      meals: number;
      others: number;
    };
  };
  meals: Array<{
    type: "Breakfast" | "Lunch" | "Dinner";
    date: Date;
    venue: string;
    isIncluded: boolean;
    preferences: string[];
  }>;
  createdFromTemplate?: Schema.Types.ObjectId; // Reference to PackageTemplate if created from one
  createdAt: Date;
  updatedAt: Date;
}
