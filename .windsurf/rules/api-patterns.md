---
trigger: always_on
---

# API Patterns

The PM-TNT backend follows RESTful API design principles with consistent patterns.

## Route Structure

- Base prefix: `/api/v1`
- Resource organization: public vs admin endpoints
- Example: `/api/v1/hotels/public` vs `/api/v1/hotels/admin`

## Authentication

- JWT-based authentication using [src/utils/jwt.config.ts](mdc:pmtnt/src/utils/jwt.config.ts)
- Authorization middleware in [src/middleware/auth.ts](mdc:pmtnt/src/middleware/auth.ts)
- Three authentication levels:
  - User authentication
  - Admin authentication
  - Super admin authentication

## Response Format

All API responses follow a consistent format:

```typescript
{
  success: boolean;
  data?: any;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  message?: string;
  errors?: Array<{
    type: string;
    path: string[];
    message: string;
  }>;
}
```

## Standard CRUD Operations

- `GET /api/v1/[resource]` - List resources with pagination
- `GET /api/v1/[resource]/:id` - Get resource by ID
- `POST /api/v1/[resource]` - Create new resource
- `PUT /api/v1/[resource]/:id` - Update resource
- `DELETE /api/v1/[resource]/:id` - Delete resource
