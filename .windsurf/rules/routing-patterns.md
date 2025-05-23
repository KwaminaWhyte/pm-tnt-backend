---
trigger: glob
globs: src/routes/**/*.ts
---

# Routing Patterns

The PM-TNT backend uses Elysia.js for routing with consistent patterns.

## Route Files

Routes are defined in [src/routes/](mdc:pm-tnt-backend/src/routes) with separate files for each resource.

Example structure:

```typescript
const resourceRoutes = new Elysia({ prefix: "/api/v1/resource" })
  .get("/", handler, options)
  .get("/:id", handler, options)
  .post("/", handler, options)
  .put("/:id", handler, options)
  .delete("/:id", handler, options);

export default resourceRoutes;
```

## Route Definition

### Handler Structure

- Route handlers typically call controller methods
- Query parameters are properly parsed and validated
- Path parameters are extracted and validated

Example:

```typescript
.get(
  "/",
  async ({ query }) =>
    controller.getResources({
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
      // Other parameters
    }),
  {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      // Schema definition
    }),
    detail: {
      // OpenAPI documentation
    },
  }
)
```

### API Documentation

- Each route includes OpenAPI documentation
- Documentation includes summaries, descriptions, and tags
- Response schemas are documented
- Response codes are documented

Example:

```typescript
detail: {
  summary: "Get all resources",
  description: "Retrieve a list of resources with pagination",
  tags: ["Resources"]
}
```

### Validation

- Input validation using Elysia's schema validation
- Type checking for path and query parameters
- Schema definition for request bodies
