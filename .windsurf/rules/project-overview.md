---
trigger: always_on
---

# PM-TNT Backend Overview

This is the backend service for PM Travel and Tourism, a tourism management platform.

## Project Structure

- Main entry point: [src/index.ts](mdc:pm-tnt-backend/src/index.ts)
- Database: MongoDB with Mongoose
- API Framework: Elysia.js

## Key Components

- **Routes**: [src/routes/](mdc:pm-tnt-backend/src/routes) - API endpoints organized by resource
- **Controllers**: [src/controllers/](mdc:pm-tnt-backend/src/controllers) - Business logic implementation
- **Models**: [src/models/](mdc:pm-tnt-backend/src/models) - Mongoose schemas and models
- **Middleware**: [src/middleware/](mdc:pm-tnt-backend/src/middleware) - Authentication and other middleware
- **Utils**: [src/utils/](mdc:pm-tnt-backend/src/utils) - Helper functions and type definitions

## Main Features

- Hotel management (bookings, rooms, availability)
- Vehicle rentals
- Travel packages
- User management (authentication, profiles)
- Booking system
- Reviews and ratings

Models are defined in [src/models/](mdc:pm-tnt-backend/src/models) with TypeScript interfaces in [src/utils/types.ts](mdc:pm-tnt-backend/src/utils/types.ts).
