---
name: drizzle-orm
description: Drizzle ORM is a headless TypeScript ORM and SQL query builder with type-safety, migrations, and live queries for PostgreSQL and SQLite. Use when setting up a database layer, creating migrations, or working with database queries in TypeScript projects.
metadata:
  audience: users
  workflow: general
---

# Drizzle ORM

Drizzle ORM is a type-safe SQL query builder and ORM for TypeScript that provides excellent performance, zero boilerplate, and excellent TypeScript DX.

## Installation

### Core packages

```bash
# Install core packages
npm install drizzle-orm drizzle-kit

# For PostgreSQL
npm install postgres

# For SQLite (libsql driver - recommended)
npm install @libsql/client

# For SQLite (better-sqlite3 driver)
npm install better-sqlite3
```

### Basic setup (PostgreSQL)

```bash
# Initialize config
bunx drizzle-kit init

# Create drizzle.config.ts
```

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```typescript
// src/db/schema.ts
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

### Basic setup (SQLite)

```bash
# Initialize config
bunx drizzle-kit init
```

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: 'file:./local.db',  // or process.env.DATABASE_URL for Turso/libsql
  },
});
```

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});
```

```typescript
// src/db/index.ts (libsql/Turso driver)
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

```typescript
// src/db/index.ts (better-sqlite3 driver)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('local.db');
export const db = drizzle(sqlite, { schema });
```

### Connecting

```typescript
// PostgreSQL using connection string
const db = drizzle('postgresql://user:password@localhost:5432/db');

// PostgreSQL using connection object (supports node-postgres options)
const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  }
});

// SQLite with libsql (local file)
const client = createClient({ url: 'file:local.db' });
const db = drizzle({ client });

// SQLite with libsql (Turso cloud)
const client = createClient({
  url: 'libsql://my-project.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle({ client });

// SQLite with better-sqlite3
const sqlite = new Database('local.db');
const db = drizzle(sqlite);
```

## Latest Features (v1.0.0-beta.2, Feb 2025)

### Relational Query Parts

Use `defineRelationsPart` to split relations config into multiple parts:

```typescript
import { defineRelations, defineRelationsPart } from 'drizzle-orm';

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(),
  }
}));

export const part = defineRelationsPart(schema, (r) => ({
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  }
}));

const db = drizzle(url, { relations: { ...relations, ...part } });
```

### Folders v3 Migrations

New migration structure eliminates journal.json Git conflicts:

```bash
# Migrate to new format
drizzle-kit up

# New structure (each migration is a folder):
migrations/
├── 0001_name/
│   ├── migration.sql
│   └── snapshot.json
├── 0002_name/
│   ├── migration.sql
│   └── snapshot.json
```

### Column Aliases

Add aliases directly to columns with `.as()`:

```typescript
const result = db
  .select({ age: users.age.as('ageOfUser'), id: users.id.as('userId') })
  .from(users)
  .orderBy(asc(users.id.as('userId')));
```

### Schema Filter Updates

`drizzle-kit` now manages ALL schemas by default. Filter with `schemaFilter` which supports glob patterns:

```typescript
// drizzle.config.ts
export default defineConfig({
  schemaFilter: 'public, custom_*',  // Glob patterns supported
  // schemaFilter: ['public', 'users'],  // Array format
});
```

### Drizzle Kit Improvements

**Full rewrite**: Architecture migrated from database snapshots to DDL snapshots, faster introspection (<1 second), better diff detection.

**New flags**:
- `drizzle-kit pull --init`: Creates migration table and marks first migration as applied
- `drizzle-kit push --force`: Auto-accept all data-loss statements (CLI only)

**Migration prefix**:
```typescript
export default defineConfig({
  migrations: {
    prefix: 'supabase'  // Results in 20240627123900_name.sql
    // prefix: 'timestamp'  // Results in unix timestamp prefix
    // prefix: 'none'  // No prefix
  }
});
```

## Query API

### Select with relations (RQBv2)

```typescript
import { eq } from 'drizzle-orm';
import { users, posts } from './schema';
import { relations } from './relations';

const result = await db.query.users.findMany({
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: [desc(posts.createdAt)],
      limit: 5,
    }
  },
});
```

### Insert, Update, Delete

```typescript
// Insert
await db.insert(users).values({ name: 'John' });

// Update
await db.update(users)
  .set({ name: 'Jane' })
  .where(eq(users.id, 1));

// Delete
await db.delete(users).where(eq(users.id, 1));
```

## Advanced Features

### Batch API

Execute multiple operations efficiently:

```typescript
await db.batch([
  db.insert(users).values({ name: 'Alice' }),
  db.insert(users).values({ name: 'Bob' }),
  db.insert(users).values({ name: 'Charlie' }),
]);
```

### Read Replicas

Configure read replicas for scaling:

```typescript
const db = drizzle(connectionString, {
  readReplicas: [
    'postgresql://replica1:5432/db',
    'postgresql://replica2:5432/db',
  ],
});
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'John' });
  await tx.insert(posts).values({ title: 'First post' });
});
```

### Cache

Enable query caching:

```typescript
const db = drizzle(connectionString, { cache: true });
```

### Set Operations

```typescript
import { union, intersect, except } from 'drizzle-orm';

const result = await union(
  db.select().from(users),
  db.select().from(admins)
);
```

## Validation

### Zod Schema Validation with drizzle-zod

Generate Zod schemas directly from Drizzle table definitions:

```bash
bun add drizzle-zod
```

```typescript
import { z } from "zod";
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
  title: z.string().min(1).max(200),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  duration: z.string().transform((val) => parseDuration(val)),
});
```

Validate CLI input before passing to command functions:

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

### Other Validators

Support for Valibot, Typebox, Arktype, and Effect Schema:

```typescript
// Valibot
import { createInsertSchema } from 'drizzle-valibot';

// Typebox
import { createInsertSchema } from 'drizzle-typebox';

// Arktype
import { createInsertSchema } from 'drizzle-arktype';

// Effect Schema
import { createInsertSchema } from 'drizzle-effect-schema';
```

## Migration Commands

```bash
# Generate migration from schema changes
bunx drizzle-kit generate

# Push schema directly to database (for prototyping)
bunx drizzle-kit push

# Apply migrations
bunx drizzle-kit migrate

# Pull schema from database
bunx drizzle-kit pull

# Export schema to SQL
bunx drizzle-kit export

# Check for schema drift
bunx drizzle-kit check

# Open Drizzle Studio
bunx drizzle-kit studio

# Upgrade to new migration format (v3)
bunx drizzle-kit up
```

## Database-Specific Features

**PostgreSQL**: See [postgresql.md](postgresql.md) for identity columns, sequences, generated columns, RLS, and cloud connections.

**SQLite**: See [sqlite.md](sqlite.md) for auto-increment keys, timestamps, full-text search, and cloud connections.

## Practical Patterns

### Type Inference from Schema

Derive types from Drizzle schema instead of hand-writing them:

```typescript
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { tasks } from "./schema";

type Task = InferSelectModel<typeof tasks>;
type NewTask = InferInsertModel<typeof tasks>;
```

### Dynamic WHERE Clauses

Build conditions array for optional filters:

```typescript
import { and, eq, isNull } from "drizzle-orm";

const conditions = [];
if (filters.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
if (!filters.includeCompleted) conditions.push(isNull(tasks.completedAt));

const results = await db
  .select()
  .from(tasks)
  .where(and(...conditions));
```

### Server-Side Expressions with `sql`

Use `sql` template literals for DB-side computations:

```typescript
import { sql } from "drizzle-orm";

await db
  .update(tasks)
  .set({ completedAt: sql`now()` })
  .where(eq(tasks.id, id));
```

### Soft Deletes vs Hard Deletes

Choose based on entity semantics:

```typescript
// Soft delete: use is_deleted flag
await db.update(tasks).set({ isDeleted: true }).where(eq(tasks.id, id));

// Hard delete: for simple reference data like labels
await db.delete(labels).where(eq(labels.id, id));
```

### Self-Referencing Foreign Keys

Use `@ts-expect-error` for circular type inference on self-referencing FKs:

```typescript
// @ts-expect-error -- circular reference between tasks.parentId and tasks.id
parentId: text("parent_id").references(() => tasks.id),
```

### Inline Type Literals for Command Parameters

Use inline object types for function params instead of separate interfaces:

```typescript
async function createTask(
  db: NodePgDatabase,
  params: { title: string; description?: string; projectId: string }
): Promise<Task> {
  // ...
}
```

### Auto-Resolve References

Create related records on-the-fly when they don't exist:

```typescript
async function resolveLabel(db: NodePgDatabase, name: string): Promise<string> {
  const existing = await db.select().from(labels).where(eq(labels.name, name));
  if (existing.length > 0) return existing[0]!.id;
  const [created] = await db.insert(labels).values({ name }).returning();
  return created!.id;
}
```

### Non-Null Assertions with `.returning()`

When using `.returning()`, assert the first element:

```typescript
const [created] = await db.insert(tasks).values(data).returning();
// created is Task | undefined, but we know it exists after insert
return created!;
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

## Key Concepts

- **Type Safety**: Full TypeScript support with inferred types from schema
- **Zero Boilerplate**: Schema is the single source of truth
- **Performance**: Excellent query performance with no N+1 issues
- **Migrations**: First-class migration system with `drizzle-kit`
- **SQL-like API**: Familiar query methods (`select`, `insert`, `update`, `delete`)
- **Relational Queries**: Powerful relation API (RQBv2) with type-safe joins
- **Headless**: Works with any driver, no runtime magic
- **Multi-Database**: Supports PostgreSQL and SQLite with the same API

## Common Patterns

### Dynamic where clauses

```typescript
import { and, eq, sql } from 'drizzle-orm';

const conditions = [];

if (filters.name) {
  conditions.push(eq(users.name, filters.name));
}

if (filters.minAge) {
  conditions.push(sql`${users.age} >= ${filters.minAge}`);
}

if (filters.isActive) {
  conditions.push(eq(users.isActive, true));
}

await db.select().from(users).where(and(...conditions));
```

### Partial inserts

```typescript
await db.insert(users).values({
  name: 'John',
  // email will be generated by database default
}).onConflictDoNothing();
```

## Resources

- **Documentation**: https://orm.drizzle.team/docs
- **Latest Releases**: https://orm.drizzle.team/docs/latest-releases
- **GitHub**: https://github.com/drizzle-team/drizzle-orm
- **Discord**: https://discord.gg/yfjTbVXMW4
- **Upgrading to v1**: https://orm.drizzle.team/docs/upgrade-v1
- **RQBv1 to v2**: https://orm.drizzle.team/docs/relations-v1-v2
