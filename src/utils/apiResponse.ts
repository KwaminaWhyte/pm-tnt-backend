/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Create an error response
 * @param status HTTP status code
 * @param payload Error details
 * @returns Error response object
 */
export function error(
  status: number,
  payload: { message: string; error?: any }
): ApiResponse<any> {
  return {
    success: false,
    message: payload.message,
    error: payload.error,
  };
}

/**
 * Create a success response
 * @param data Response data
 * @param meta Optional metadata
 * @returns Success response object
 */
export function success<T>(
  data: T,
  meta?: ApiResponse<T>["meta"]
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Create a paginated response
 * @param data Response data
 * @param page Current page number
 * @param limit Items per page
 * @param total Total items
 * @returns Paginated response object
 */
export function paginated<T>(
  data: T,
  page: number,
  limit: number,
  total: number
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
