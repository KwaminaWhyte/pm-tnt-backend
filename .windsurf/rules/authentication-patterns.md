---
trigger: model_decision
---

# Authentication Patterns

The PM-TNT backend uses JWT for authentication with multiple user roles.

## Authentication Setup

- JWT configuration in [src/utils/jwt.config.ts](mdc:pm-tnt-backend/src/utils/jwt.config.ts)
- Authentication middleware in [src/middleware/auth.ts](mdc:pm-tnt-backend/src/middleware/auth.ts)
- Auth routes in [src/routes/user-auth.ts](mdc:pm-tnt-backend/src/routes/user-auth.ts) and [src/routes/admin-auth.ts](mdc:pm-tnt-backend/src/routes/admin-auth.ts)

## User Types

- Regular users (customers/clients)
- Admin users (standard administrative access)

## Authentication Flow

1. User registers or logs in via auth endpoints
2. System generates JWT token with user ID and role
3. Token is sent to client
4. Client includes token in Authorization header for protected routes
5. Middleware verifies token and attaches user to request

## Middleware Functions

- `verifyToken`: Base token verification
- `requireAuth`: Ensures a valid user is authenticated
- `requireAdmin`: Restricts access to admins

## Token Format

```typescript
{
  id: string; // User or admin ID
  role: "user" | "admin";
}
```

## Protected Route Example

```typescript
.get(
  "/admin",
  async ({ jwt_auth, headers }) => {
    const user = await requireAdmin({ jwt_auth, headers });
    // Route implementation
  },
  {
    detail: {
      // OpenAPI documentation
    },
  }
)
```

## Authorization Headers

All authenticated requests must include:

```
Authorization: Bearer <jwt_token>
```
