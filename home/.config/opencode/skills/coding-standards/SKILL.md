---
name: coding-standards
description: Core coding standards covering functional style, TypeScript conventions, naming, readability, and testing. Use when writing or reviewing TypeScript code.
metadata:
  audience: developers
  workflow: coding
---

# Coding Standards

## Functional Style

### Prefer functional methods over loops

```ts
const names = allUsers.map((user) => user.name);
const activePosts = allUsers.filter((u) => u.isActive).flatMap((u) => u.posts);
```

### Prefer immutable over mutable

```ts
const allUsers = [...oldUsers, newUser];
```

### Prefer ternary over let mutation

```ts
const x = y === 1 ? 2 : 3;
```

## TypeScript

### Strict typing

- No `any` — use `unknown` if necessary
- `strict: true` in tsconfig
- `noImplicitAny: true`

### Prefer `Map` over `Object.fromEntries` for dynamic keys

`Map.get()` is automatically `T | undefined`:

```ts
const fruitCountMap = new Map<string, number>(fruitCount);
```

### Prefer tuple types for fixed-length arrays

```ts
const tuple: [number, number, number] = [0, 1, 2];
```

### Prefer `.at()` over bracket access for dynamic arrays

```ts
const firstUser = allUsers.at(0);
```

### Prefer discriminated unions over optional fields

```ts
type Application = VirginiaApplication | OhioApplication;

interface VirginiaApplication {
  state: "Virginia";
  ssnLast4: string;
}

interface OhioApplication {
  state: "Ohio";
  photoIdBase64: string;
}
```

### Prefer `interface` over `type` for objects

Use `type` only for unions and other syntax `interface` doesn't support.

### Prefer string literal unions over enums

```ts
type UserRole = "admin" | "user" | "guest";
```

### Prefer `Set` for membership checks

```ts
const todoSet = new Set(doneTodoIds);
return todos.map((todo) => <Todo done={todoSet.has(todo.id)} />);
```

### Named exports only

No default exports.

### Optional chaining over `&&`

```ts
const userName = user?.name;
const street = user?.address?.street;
```

### Prefer `const` arrow functions

```ts
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};
```

### Exception: use `function` for iterators/generators

```ts
async function* streamValues(): AsyncGenerator<number, void, void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    yield i;
  }
}
```

## Naming Conventions

- Values: `camelCase`
- Classes, types, interfaces: `PascalCase`
- Zod schemas: `Z*` prefix (`ZUser`, `ZName`)
- Inferred types: `z.infer<typeof ZUser>`

```ts
const ZUser = z.object({ name: z.string() });
type User = z.infer<typeof ZUser>;
```

## Readability

### Prefer `switch` over chained `if/else if`

### Reduce nesting — return early

```ts
function process(data: Data) {
  if (!shouldProcess(data)) return;
  const cleaned = clean(data);
  return computeResult(cleaned);
}
```

### Flatten compound conditionals

```ts
if (a && b) return 1;
if (a && !b) return 2;
if (!a && b) return 3;
return 4;
```

### Handle base/error cases early

```ts
if (!user) throw new Error("No user found");
if (user.friends.length === 0) return 0;
return computeFriendStats(user);
```

### Extract inner logic into well-named functions

### Prefer self-documenting names over comments

Reserve comments for complex business logic.

### Prefer custom env vars over `process.env.NODE_ENV`

```ts
if (process.env.RUN_MAGIC) {
  runMagic();
}
```

## Testing

### When to test

- Deep conditional logic (if statements aren't type-checked)
- Untypable logic (e.g., measurements in different units, both typed as `number`)

### Prefer dependency injection for testability

```ts
const in20thCentury = (today = new Date()) => {
  const year = today.getFullYear();
  return year >= 1900 && year < 2000;
};

in20thCentury();
in20thCentury(mockDate);
```

### Use `bun test` over Jest

Built-in TypeScript and environment variable support.
