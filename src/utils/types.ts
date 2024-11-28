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

interface VehicleInterface {
  vehicleType: string;
  make: string;
  model: string;
  year?: number;
  features: string[];
  capacity: number;
  pricePerDay: number;
  availability: {
    isAvailable: boolean;
    location: {
      city: string;
      country: string;
    };
  };
  ratings?: Array<{
    userId: string;
    rating: number;
    comment?: string;
    createdAt: Date;
  }>;
  images: string[];
  policies?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CreateVehicleDTO {
  vehicleType: string;
  make: string;
  model: string;
  year?: number;
  features: string[];
  capacity: number;
  pricePerDay: number;
  city: string;
  country: string;
  images: string[];
  policies?: string;
}

interface UpdateVehicleDTO extends Partial<CreateVehicleDTO> {
  isAvailable?: boolean;
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

export {
  UserInterface,
  LoginWithEmailDTO,
  LoginWithPhoneDTO,
  VerifyOtpDTO,
  OTP,
  VehicleInterface,
  CreateVehicleDTO,
  UpdateVehicleDTO,
  VehicleSearchParams,
  VehicleRatingDTO,
  RegisterDTO,
};
