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

## References

- [Zod documentation](https://zod.dev/)
- [Error formatting](https://zod.dev/error-formatting)
- [Schema reference](https://zod.dev/?id=schemas)
