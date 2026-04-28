---
name: bun
description: Provides guidance for using Bun as a JavaScript runtime, bundler, package manager, and test runner. Use when working with TypeScript/JavaScript projects to replace Node.js, npm, pnpm, vite, or other tooling.
license: MIT
compatibility: opencode
metadata:
  audience: users
  workflow: general
---

# Bun

Default to using Bun instead of Node.js for JavaScript/TypeScript projects.

## Command equivalents

Replace Node.js and npm commands with Bun equivalents:

| Task | Node.js/npm | Bun |
|------|-------------|-----|
| Run file | `node file.ts` or `ts-node` | `bun file.ts` |
| Install deps | `npm install`, `yarn install`, `pnpm install` | `bun install` |
| Run script | `npm run script`, `yarn run script`, `pnpm run script` | `bun run script` |
| Execute package | `bunx package cmd` | `bunx package cmd` |
| Build | `webpack`, `esbuild`, `vite build` | `bun build file.html\|file.ts\|file.css` |
| Test | `jest`, `vitest` | `bun test` |

**Note**: Bun automatically loads `.env` files. Don't use `dotenv`.

## Built-in APIs

Prefer Bun's built-in APIs over npm packages:

- `Bun.serve()` - HTTP server with WebSockets, HTTPS, and routing (don't use `express`)
- `bun:sqlite` - SQLite database (don't use `better-sqlite3`)
- `Bun.redis` - Redis client (don't use `ioredis`)
- `Bun.sql` - Postgres client (don't use `pg` or `postgres.js`)
- `WebSocket` - Built-in WebSocket support (don't use `ws`)
- `Bun.file()` - File operations (prefer over `node:fs` readFile/writeFile)
- `Bun.$`command\`` - Shell commands (instead of `execa`)

## Testing

Use `bun test` for running tests.

```ts
import { test, expect } from "bun:test";

test("example test", () => {
  expect(1 + 1).toBe(2);
});

test("async test", async () => {
  const result = await Promise.resolve(42);
  expect(result).toBe(42);
});
```

Run tests with:
```sh
bun test
```

## Frontend development

Use `Bun.serve()` with HTML imports instead of vite. HTML imports support React, CSS, and Tailwind.

### Server setup

```ts
import index from "./index.html";

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  websocket: {
    open: (ws) => ws.send("Connected!"),
    message: (ws, message) => ws.send(message),
    close: (ws) => console.log("Connection closed"),
  },
  development: {
    hmr: true,
    console: true,
  },
});
```

### HTML with imports

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

### Frontend component

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

### Run the server

```sh
bun --hot ./index.ts
```

## Database Testing with PGLite

Use `@electric-sql/pglite` for in-memory PostgreSQL in tests. No external DB needed.

### Setup

```bash
bun add -d @electric-sql/pglite
```

### Test Helper

```typescript
// tests/e2e/helpers.ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function setupTestDb(): Promise<NodePgDatabase<typeof schema>> {
  const pglite = new PGlite();
  const sql = readFileSync(
    join(__dirname, "../../src/db/migrations/0000_migration.sql"),
    "utf-8"
  )
    .replace(/^-->.*$/gm, "")
    .replace(/^--.*$/gm, "");
  await pglite.exec(sql);
  return drizzle(pglite) as NodePgDatabase<typeof schema>;
}

export async function teardownTestDb(pglite: PGlite): Promise<void> {
  await pglite.close();
}
```

### Test Pattern

Fresh DB instance per `describe` block for isolation. Import command functions directly, don't spawn CLI process:

```typescript
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { setupTestDb, teardownTestDb } from "./helpers";
import { createTask } from "../../src/commands/task";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

describe("task CRUD", () => {
  let db: NodePgDatabase;

  beforeEach(async () => {
    db = await setupTestDb();
  });

  afterEach(async () => {
    await teardownTestDb((db as any).$client);
  });

  test("creates a task with all options", async () => {
    const task = await createTask(db, {
      title: "Test task",
      description: "A description",
      projectId: project.id,
    });
    expect(task.title).toBe("Test task");
  });
});
```

### Run Targeted Tests

Only run tests for the specific file being worked on:

```bash
bun test tests/e2e/task.test.ts
```

## API documentation

For detailed API documentation, refer to `node_modules/bun-types/docs/**/*.mdx` after installing bun-types.
