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

interface LoginWithPhoneDTO {
  phone: string;
}

interface VerifyOtpDTO {
  phone: string;
  otp: string;
}

export { UserInterface, LoginWithEmailDTO, LoginWithPhoneDTO, VerifyOtpDTO, OTP };