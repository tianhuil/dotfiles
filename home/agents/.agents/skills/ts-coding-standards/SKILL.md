---
name: ts-coding-standards
description: TypeScript code standards as good vs bad examples — functional style, strict typing, Zod validation, docstrings, named params, imports, error handling, naming, readability. Use when writing or reviewing TypeScript code.
metadata:
  audience: developers
  workflow: coding
---

# TypeScript Coding Standards

Good vs bad examples for writing clean, functional, type-safe TypeScript.
For repo tooling (package manager, Biome, tsconfig), see the `ts-coding-setup` skill.

## Functional Style

Prefer functional methods (`map`, `filter`, `flatMap`, `reduce`) over `for`/`while` loops:

```ts
// ✅ Correct
const names = allUsers.map((user) => user.name);

// ❌ Incorrect
const names: string[] = [];
for (const user of allUsers) {
  names.push(user.name);
}

// ✅ Correct
const allPosts = allUsers.filter((user) => user.isActive).flatMap((user) => user.posts);

// ❌ Incorrect
const posts: Post[] = [];
for (const user of allUsers) {
  if (user.isActive) {
    posts.push(...user.posts);
  }
}
```

Prefer immutable values. Use `const`; never mutate arguments or shared state:

```ts
// ✅ Correct
const allUsers = [...oldUsers, newUser];

// ❌ Incorrect
oldUsers.push(newUser);
```

Prefer a ternary over `let` + reassignment:

```ts
// ✅ Correct
const x = y === 1 ? 2 : 3;

// ❌ Incorrect
let x = 2;
if (y === 1) {
  x = 2;
} else {
  x = 3;
}
```

Use `reduce` for simple accumulation; if a loop is truly clearer, isolate it in a `const` IIFE:

```ts
// ✅ Correct
const total = items.reduce((sum, item) => sum + item.price, 0);

// ✅ Acceptable — loop confined inside a const expression
const total = (() => {
  let sum = 0;
  for (const item of items) {
    sum += item.price;
  }
  return sum;
})();

// ❌ Incorrect — top-level let mutation
let total = 0;
for (const item of items) {
  total += item.price;
}
```

Build objects functionally:

```ts
// ✅ Correct
const userMap = new Map(users.map((user) => [user.id, user]));

// ❌ Incorrect
const userMap: Record<string, User> = {};
for (const user of users) {
  userMap[user.id] = user;
}
```

## Types

### Strict typing

- No `any` — use `unknown` if necessary
- No type assertions (`as User`, `as any`) — fix types upstream instead
- Prefer type guards (`data is User`) for runtime narrowing:

```ts
// ✅ Correct
function isUser(data: unknown): data is User {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "name" in data
  );
}

// ❌ Incorrect
const user = data as User;
const user = data as unknown as User;
```

### Explicit annotations

Annotate function signatures and use library types — never invent duplicate types for known libraries:

```ts
// ✅ Correct
import type { Request, Response } from "express";

async function handler(req: Request, res: Response): Promise<void> {
  res.json({ success: true });
}

// ❌ Incorrect
interface MyServer {
  on: (event: string, callback: Function) => void;
}
```

### Type shape preferences

```ts
// ✅ Map over Record — .get() is automatically T | undefined
const fruitCountMap = new Map<string, number>(fruitCount);

// ✅ Tuple for fixed-length arrays
const rgb: [number, number, number] = [0, 128, 255];

// ✅ .at() over bracket access for dynamic indexing — returns T | undefined
const firstUser = allUsers.at(0);

// ✅ Discriminated unions over optional fields
type Application = VirginiaApplication | OhioApplication;
interface VirginiaApplication {
  state: "Virginia";
  ssnLast4: string;
}
interface OhioApplication {
  state: "Ohio";
  photoIdBase64: string;
}

// ✅ String literal unions over enums
type UserRole = "admin" | "user" | "guest";

// ✅ interface for objects; type only for unions/aliases
interface User {
  id: string;
  name: string;
}

// ✅ Set for membership checks
const todoSet = new Set(doneTodoIds);
return todos.map((todo) => <Todo done={todoSet.has(todo.id)} />);

// ✅ Optional chaining
const street = user?.address?.street;
```

### Zod for validation

```ts
// ✅ Correct
import { z } from "zod";

const ZUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});
type User = z.infer<typeof ZUser>;

function validateUser(data: unknown): User | null {
  const result = ZUser.safeParse(data);
  return result.success ? result.data : null;
}

// ❌ Incorrect — manual JSON validation with casts
function validateUser(data: unknown): User | null {
  if (typeof data !== "object" || data === null) return null;
  const user = data as Record<string, unknown>;
  /* ... */
}
```

## Functions

### Named parameters for 2+ arguments

```ts
// ✅ Correct — define the params interface immediately before the function
interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  attachments?: string[];
}

async function sendEmail(params: SendEmailParams): Promise<void> {
  /* ... */
}

await sendEmail({ to: "user@example.com", subject: "Welcome", body: "Hello!" });

// ✅ Correct — single-argument functions take the value directly
function validateEmail(email: string): boolean {
  /* ... */
}

// ❌ Incorrect — positional parameter lists
function sendEmail(to: string, subject: string, body: string): Promise<void> {
  /* ... */
}
```

### Named exports; `const` arrow functions

```ts
// ✅ Correct
export const formatDate = (date: Date): string =>
  date.toISOString().split("T")[0] ?? "";

// ❌ Incorrect — default exports
export default formatDate;
```

Exception: use `function` declarations for generators/iterators:

```ts
async function* streamValues(): AsyncGenerator<number, void, void> {
  yield 1;
}
```

### Docstrings on every top-level function/class

```ts
/**
 * Calculates the total price of items in a cart.
 * @param items - Array of cart items to calculate
 * @returns The total price as a number
 */
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

Nested subfunctions don't need docstrings.

## Imports

```ts
// ✅ Correct — sibling/relative-child imports or @/ alias
import { Button } from "./components/Button";
import { formatCurrency } from "@/utils/currency";

// ❌ Incorrect — deep relative-parent paths
import { formatCurrency } from "../../../utils/currency";
```

Group imports: framework → third-party → local (`@/`) → types (`import type`) → styles.

## Error Handling

`try`/`catch` only at the root calling function; let intermediate errors propagate:

```ts
// ✅ Correct
async function handleUserRequest(requestId: string): Promise<void> {
  try {
    const data = await fetchData(requestId);
    await saveResult(await processData(data));
  } catch (error) {
    logger.error("Failed to handle user request:", error);
    throw error;
  }
}

// ❌ Incorrect — try/catch that only logs and rethrows in every layer
async function fetchData(requestId: string): Promise<Data> {
  try {
    const response = await fetch(`/api/data/${requestId}`);
    return response.json();
  } catch (error) {
    console.error("Failed to fetch data:", error);
    throw error;
  }
}
```

## Multiline Strings

```ts
// ✅ Correct
import dedent from "dedent";

const sql = dedent`
  SELECT users.id, users.name
  FROM users
  WHERE users.active = true
`;

// ❌ Incorrect — manual indentation inside template literals
const sql = `SELECT users.id, users.name
  FROM users
  WHERE users.active = true`;
```

## Naming Conventions

- Values: `camelCase`
- Classes, types, interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Zod schemas: `Z` prefix (`ZUser`); types via `z.infer<typeof ZUser>`
- Prefer self-documenting names over comments; reserve comments for complex business logic
- Prefer custom env vars over `process.env.NODE_ENV`: `if (process.env.RUN_MAGIC) { ... }`

## Readability

Return early; handle base/error cases first; reduce nesting:

```ts
// ✅ Correct
function process(data: Data) {
  if (!shouldProcess(data)) return;
  return computeResult(clean(data));
}
```

Prefer `switch` over chained `if/else if`; flatten compound conditionals:

```ts
if (a && b) return 1;
if (a && !b) return 2;
if (!a && b) return 3;
return 4;
```

Extract inner logic into well-named functions.

## Testing

Test deep conditional logic and untypable logic (e.g. units of measurement both typed as `number`). Prefer dependency injection for testability:

```ts
// ✅ Correct — injectable clock
const in20thCentury = (today = new Date()): boolean => {
  const year = today.getFullYear();
  return year >= 1900 && year < 2000;
};
```

Run only the test file you're writing; ignore unrelated failures.
