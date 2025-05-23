---
trigger: glob
globs: src/controllers/**/*.ts
---

# Controller Patterns

Controllers in the PM-TNT backend handle business logic and interact with models.

## Structure

Controllers are defined in [src/controllers/](mdc:pmtnt/src/controllers) as classes with methods for each operation.

Example structure:

```typescript
export default class ResourceController {
  async getResources(params) { ... }
  async getResourceById(id) { ... }
  async createResource(data) { ... }
  async updateResource(id, data) { ... }
  async deleteResource(id) { ... }
  // Additional specialized methods
}
```

## Common Patterns

### Error Handling

- Consistent error format
- Try/catch blocks in all methods
- Specialized error types
- Detailed error messages

Example:

```typescript
try {
  // Business logic
} catch (error: any) {
  if (error.message.startsWith("{")) {
    throw error;
  }
  throw new Error(
    JSON.stringify({
      message: "Failed operation description",
      errors: [
        {
          type: "ErrorType",
          path: ["field"],
          message: error.message,
        },
      ],
    })
  );
}
```

### Response Format

- Consistent success responses
- Pagination for list endpoints
- Properly structured data

Example:

```typescript
return {
  success: true,
  data: resource,
  pagination: {
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    totalItems: totalCount,
    itemsPerPage: limit,
  },
};
```

### Input Validation

- Parameter validation at controller level
- Type checking and conversion
- Default values for optional parameters
