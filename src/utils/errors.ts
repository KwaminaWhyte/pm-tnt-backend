/**
 * Custom error classes for the application
 * These errors will be caught by Elysia's error handling middleware
 */

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with ID ${id}` : ''} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Not authorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ServerError extends Error {
  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'ServerError';
  }
}

export class DuplicateError extends Error {
  constructor(resource: string, field: string) {
    super(`${resource} with this ${field} already exists`);
    this.name = 'DuplicateError';
  }
}

export class BadRequestError extends Error {
  constructor(message: string = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}
