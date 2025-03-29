interface OTP {
  code: string;
  expiresAt: Date;
}

interface UserInterface {
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

interface LoginWithEmailDTO {
  email: string;
  password: string;
}

interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface LoginWithPhoneDTO {
  phone: string;
}

interface VerifyOtpDTO {
  phone: string;
  otp: string;
}

interface LocationInterface {
  address: string;
  city: string;
  country: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface RatingInterface {
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

interface HotelInterface {
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

interface VehicleInterface {
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

interface CreateHotelDTO {
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

interface CreateVehicleDTO {
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

interface UpdateHotelDTO extends Partial<Omit<CreateHotelDTO, "rooms">> {
  rooms?: Array<{
    roomNumber: string;
    isAvailable?: boolean;
    maintenanceStatus?: "Available" | "Cleaning" | "Maintenance";
    pricePerNight?: number;
  }>;
}

interface UpdateVehicleDTO extends Partial<CreateVehicleDTO> {
  "availability.isAvailable"?: boolean;
  "maintenance.status"?: "Available" | "In Service" | "Repairs Needed";
}

interface VehicleSearchParams {
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

interface VehicleRatingDTO {
  rating: number;
  comment?: string;
}

interface BookingInterface {
  user: string;
  hotel?: string;
  vehicle?: string;
  travelPackage?: string;
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

interface CreateBookingDTO {
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

interface UpdateBookingDTO {
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

interface BookingSearchParams {
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

interface BookingPricingResponse {
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

export {
  UserInterface,
  LoginWithEmailDTO,
  LoginWithPhoneDTO,
  VerifyOtpDTO,
  OTP,
  HotelInterface,
  VehicleInterface,
  CreateHotelDTO,
  CreateVehicleDTO,
  UpdateHotelDTO,
  UpdateVehicleDTO,
  VehicleSearchParams,
  VehicleRatingDTO,
  RegisterDTO,
  BookingInterface,
  CreateBookingDTO,
  UpdateBookingDTO,
  BookingSearchParams,
  BookingPricingResponse,
};
