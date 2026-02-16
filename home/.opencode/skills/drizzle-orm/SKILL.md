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
npx drizzle-kit init

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
npx drizzle-kit init
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

## PostgreSQL Features (v0.32.0)

### Identity Columns

Replace deprecated `serial` with recommended `identity`:

```typescript
import { pgTable, integer, generatedAlwaysAsIdentity } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity({ 
    startWith: 1000 
  }),
  name: text('name').notNull(),
});
```

### Sequences

Define PostgreSQL sequences:

```typescript
import { pgSequence } from 'drizzle-orm/pg-core';

export const customSequence = pgSequence('name', {
  startWith: 100,
  maxValue: 10000,
  minValue: 100,
  cycle: true,
  increment: 2,
});

// In custom schema
import { pgSchema } from 'drizzle-orm/pg-core';
export const customSchema = pgSchema('custom_schema');
export const customSequence = customSchema.sequence('name');
```

### Generated Columns

Compute columns from expressions:

```typescript
import { sql } from 'drizzle-orm';
import { pgTable, integer, text, customType } from 'drizzle-orm/pg-core';

const tsVector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const test = pgTable('test', {
  id: integer('id').primaryKey(),
  content: text('content'),
  contentSearch: tsVector('content_search', {
    dimensions: 3,
  }).generatedAlwaysAs(
    () => sql`to_tsvector('english', ${test.content})`
  ),
});
```

### Row-Level Security (RLS)

Mark tables with RLS enabled:

```typescript
// NEW syntax
import { pgTable } from 'drizzle-orm/pg-core';

export const users = pgTable.withRLS('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

  // OLD syntax (deprecated)
  export const usersOld = pgTable('users', {}).enableRLS();
```

## SQLite Features

### Auto-Incrementing Primary Keys

```typescript
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});
```

### Foreign Keys

```typescript
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id),
});
```

### Timestamps

SQLite doesn't have native timestamp types, use integers with mode conversion:

```typescript
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Stores as integer Unix timestamp
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$onUpdate(() => new Date()),
});
```

### Full-Text Search (FTS5)

```typescript
import { fts5Table } from 'drizzle-orm/sqlite-core';

export const postsFts = fts5Table('posts_fts', {
  content: text('content'),
  title: text('title'),
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

### Zod Schema Validation

```typescript
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { users } from './schema';

export const insertUserSchema = createInsertSchema(users, z.object({
  name: z.string().min(1),
}));

// Validates on insert
await db.insert(users).values(insertUserSchema.parse({ name: 'John' }));
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
npx drizzle-kit generate

# Push schema directly to database (for prototyping)
npx drizzle-kit push

# Apply migrations
npx drizzle-kit migrate

# Pull schema from database
npx drizzle-kit pull

# Export schema to SQL
npx drizzle-kit export

# Check for schema drift
npx drizzle-kit check

# Open Drizzle Studio
npx drizzle-kit studio

# Upgrade to new migration format (v3)
npx drizzle-kit up
```

## Cloud Database Connections

### PostgreSQL Cloud Databases

Drizzle supports PostgreSQL cloud databases with dedicated driver packages:

```bash
npm install @neondatabase/serverless  # Neon
npm install @vercel/postgres      # Vercel
npm install @aws-sdk/client-rds-data-api
npm install @prisma/postgres
npm install @supabase/postgres-js2
npm install @xata/client
npm install @effect/postgres
```

### SQLite Cloud Databases

```bash
npm install @libsql/client  # Turso/libsql
```

```typescript
// Neon
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

// Vercel Postgres
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { vercel } from '@vercel/postgres';

const client = vercel();
const db = drizzle({ client });

// Turso (libsql)
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://my-project.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle({ client });
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
