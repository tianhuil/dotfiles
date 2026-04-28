---
name: zod-ts
description: Provides guidance on error handling using Zod for TypeScript runtime validation.
compatibility: opencode
metadata:
  audience: users
  workflow: general
---

# Zod TypeScript Validation

## Quick start

Define schemas and validate data:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

const result = UserSchema.parse({ name: "John", email: "john@example.com" });
```

## Terminal error display

**IMPORTANT**: When displaying Zod errors in a terminal or CLI, always use `z.prettifyError()`:

```typescript
import { z } from "zod";

try {
  UserSchema.parse({ name: "X", email: "invalid" });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(z.prettifyError(error));
  }
}
```

This provides formatted, readable error output instead of raw error objects.

See [Zod error formatting](https://zod.dev/error-formatting#zprettifyerror) for details.

## Drizzle-Zod Integration

Generate Zod schemas from Drizzle table definitions:

```typescript
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { tasks } from "./schema";

export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export const selectTaskSchema = createSelectSchema(tasks);

type InsertTask = z.infer<typeof insertTaskSchema>;
type SelectTask = z.infer<typeof selectTaskSchema>;
```

Override specific fields for stricter validation:

```typescript
export const insertTaskSchema = createInsertSchema(tasks, {
  // Override auto-generated defaults
  title: z.string().min(1).max(200),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  // Add custom validation for CLI-specific fields
  duration: z.string().transform((val) => parseDuration(val)),
});
```

Use in CLI layer to validate user input before passing to command functions:

```typescript
program.command("create").action(async (opts) => {
  const parsed = insertTaskSchema.safeParse(opts);
  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error));
    process.exit(1);
  }
  await createTask(db, parsed.data);
});
```

## References

- [Zod documentation](https://zod.dev/)
- [Error formatting](https://zod.dev/error-formatting)
- [Schema reference](https://zod.dev/?id=schemas)
