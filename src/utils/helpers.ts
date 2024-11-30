import { ApiResponse } from "./types";

/**
 * Create a standardized API response
 */
export function createResponse<T>(
  success: boolean,
  statusCode: number,
  message: string,
  data?: T,
  errors?: Array<{ message: string; path?: string[]; type?: string }>
): ApiResponse<T> {
  return {
    success,
    statusCode,
    message,
    data,
    errors,
    timestamp: new Date().toISOString()
  };
}

/**
 * Extract user ID from request object
 */
export function getUserId(request: { userId?: string }): string {
  if (!request.userId) {
    throw new Error(JSON.stringify({
      status: "error",
      message: "Unauthorized",
      errors: [{
        type: "AuthError",
        path: ["authorization"],
        message: "User ID not found in request"
      }]
    }));
  }
  return request.userId;
}

/**
 * Calculate date difference in days
 */
export function calculateDateDifference(startDate: Date, endDate: Date): number {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount);
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date, endDate: Date): void {
  if (startDate >= endDate) {
    throw new Error(JSON.stringify({
      status: "error",
      message: "Invalid date range",
      errors: [{
        type: "ValidationError",
        path: ["dates"],
        message: "End date must be after start date"
      }]
    }));
  }

  const now = new Date();
  if (startDate < now) {
    throw new Error(JSON.stringify({
      status: "error",
      message: "Invalid date range",
      errors: [{
        type: "ValidationError",
        path: ["startDate"],
        message: "Start date cannot be in the past"
      }]
    }));
  }
}

/**
 * Generate a random booking reference
 */
export function generateBookingReference(): string {
  const prefix = "BK";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Parse query parameters for pagination
 */
export function parsePaginationParams(query: { page?: string | number; limit?: string | number }) {
  const page = typeof query.page === "string" ? parseInt(query.page, 10) : (query.page || 1);
  const limit = typeof query.limit === "string" ? parseInt(query.limit, 10) : (query.limit || 10);
  return { page, limit };
}

/**
 * Calculate total pages based on total items and limit
 */
export function calculateTotalPages(totalItems: number, limit: number): number {
  return Math.ceil(totalItems / limit);
}

/**
 * Calculate skip count for pagination
 */
export function calculateSkipCount(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
}
