---
trigger: glob
globs: src/models/**/*.ts
---

# Model Patterns

The PM-TNT backend uses Mongoose for MongoDB data modeling with consistent patterns.

## Schema Definition

Models are defined in [src/models/](mdc:pmtnt/src/models) with TypeScript interfaces in [src/utils/types.ts](mdc:pmtnt/src/utils/types.ts).

Example schema pattern:

```typescript
const schema = new Schema<InterfaceType>(
  {
    // Schema fields
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes, virtuals, middleware, and methods here

let ModelName: Model<InterfaceType>;
try {
  ModelName = mongoose.model<InterfaceType>("collection_name");
} catch (error) {
  ModelName = mongoose.model<InterfaceType>("collection_name", schema);
}
```

## Common Model Components

### Schemas

- Well-defined schemas with validation
- Required fields marked explicitly
- Nested objects for complex data
- Enum values for constrained fields

### Indexes

- Text indexes for searchable fields
- Geospatial indexes for location queries
- Compound indexes for commonly filtered fields

### Virtuals

- Calculated properties (e.g., averageRating)
- Properly configured for JSON serialization

### Middleware

- Pre-save hooks for validation
- Pre-update hooks for data consistency
- Error handling in middleware
