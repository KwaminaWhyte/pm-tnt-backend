// Import necessary module
import crypto from "crypto";

// Function to generate OTP
const generateOTP = (length: number = 6): string => {
  // Ensure the length is a positive integer and reasonable for an OTP
  if (length <= 0 || length > 10) {
    throw new Error("OTP length must be between 1 and 10 digits");
  }

  // Generate a random number within the range of 10^(length-1) to 10^length - 1
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  // Generate a random number within the specified range
  const otp = crypto.randomInt(min, max + 1).toString();
  return otp;
};

export default generateOTP;
