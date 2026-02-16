---
name: drizzle-orm
description: Drizzle ORM is a headless TypeScript ORM and SQL query builder with type-safety, migrations, and live queries. Supports PostgreSQL, MySQL, SQLite, MSSQL, CockroachDB, and many cloud databases. Use when setting up a database layer, creating migrations, or working with database queries in TypeScript projects.
license: MIT
compatibility: opencode
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

# For MySQL
npm install mysql2

# For SQLite
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

### Connecting

```typescript
// Using connection string
const db = drizzle('postgresql://user:password@localhost:5432/db');

// Using connection object (supports node-postgres options)
const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  }
});
```

## Latest Features (v1.0.0-beta.2, Feb 2025)

### New Dialect Support

**MSSQL and CockroachDB**: Full support in `drizzle-orm`, `drizzle-kit`, and `drizzle-seed` packages. Relational Query Builder v2 (RQBv2) not yet supported.

```typescript
// MSSQL
import { drizzle } from 'drizzle-orm/node-mssql';
const db = drizzle(process.env.DATABASE_URL);

// CockroachDB
import { drizzle } from 'drizzle-orm/cockroach';
const db = drizzle(process.env.DATABASE_URL);
```

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

### MySQL New Column Types

Added blob types for MySQL:

```typescript
import { blob, tinyblob, mediumblob, longblob } from 'drizzle-orm/mysql-core';

export const files = mysqlTable('files', {
  data: blob('data'),
  preview: tinyblob('preview'),
  content: mediumblob('content'),
  archive: longblob('archive'),
});
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

## MySQL Features (v0.32.0)

### $returningId()

MySQL doesn't support `RETURNING`. Use `$returningId()` to get inserted IDs:

```typescript
import { mysqlTable, int, text } from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

// Auto-increment PK
const usersTable = mysqlTable('users', {
  id: int('id').primaryKey(),
  name: text('name').notNull(),
});

const result = await db.insert(usersTable)
  .values([{ name: 'John' }, { name: 'Jane' }])
  .$returningId();
// Returns: { id: number }[]

// Custom PK with $default
const usersTableFn = mysqlTable('users_custom', {
  customId: varchar('id', { length: 256 }).primaryKey().$defaultFn(createId),
  name: text('name').notNull(),
});

const result = await db.insert(usersTableFn)
  .values([{ name: 'John' }])
  .$returningId();
// Returns: { customId: string }[]
```

### Generated Columns (MySQL/SQLite)

```typescript
import { sql } from 'drizzle-orm';

export const users = mysqlTable('users', {
  id: int('id').primaryKey(),
  name: text('name').notNull(),
  generatedName: text('gen_name').generatedAlwaysAs(
    () => sql`${usersTable.name} || ' hello'`,
    { mode: 'stored' }  // or 'virtual'
  ),
});
```

**Limitations with `push` command**: You can't modify generated expression type in existing tables. Use `generate` for production migrations.

## Live Queries (v0.31.1)

Native React Hook for automatic re-querying on data changes (works with SQL-like and Drizzle Queries):

```typescript
import { useLiveQuery, drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { users } from './schema';

const expo = openDatabaseSync('db.db', { enableChangeListener: true });
const db = drizzle(expo);

const App = () => {
  // Re-runs automatically when data changes
  const { data } = useLiveQuery(db.select().from(users));
  
  // Returns data, error, updatedAt for error handling
  const { data, error, updatedAt } = useLiveQuery(db.query.users.findFirst());
  
  return <Text>{JSON.stringify(data)}</Text>;
};
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

Drizzle supports many cloud databases with dedicated driver packages:

### PostgreSQL

```bash
npm install @neondatabase/serverless  # Neon
npm install @vercel/postgres      # Vercel
npm install @aws-sdk/client-rds-data-api
npm install @prisma/postgres
npm install @supabase/postgres-js2
npm install @xata/client
npm install @effect/postgres
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
```

### MySQL

```bash
npm install @planetscale/database-js
npm install @tidb/serverless
```

```typescript
// PlanetScale
import { drizzle } from 'drizzle-orm/planetscale';
import { connect } from '@planetscale/database-js';

const client = await connect({ url: process.env.DATABASE_URL });
const db = drizzle({ client });
```

### SQLite

```bash
npm install @libsql/client
npm install @libsql/serverless
npm install better-sqlite3
npm install @op-engine/op-sqlite
npm install expo-sqlite  # React Native
npm install @op-engine/react-native-sqlite  # React Native
npm install @cloudflare/d1
```

```typescript
// LibSQL
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient();
const db = drizzle({ client });

// Cloudflare D1
import { drizzle } from 'drizzle-orm/cloudflare-d1';

const db = drizzle(env.DB);
```

## Key Concepts

- **Type Safety**: Full TypeScript support with inferred types from schema
- **Zero Boilerplate**: Schema is the single source of truth
- **Performance**: Excellent query performance with no N+1 issues
- **Migrations**: First-class migration system with `drizzle-kit`
- **SQL-like API**: Familiar query methods (`select`, `insert`, `update`, `delete`)
- **Relational Queries**: Powerful relation API (RQBv2) with type-safe joins
- **Headless**: Works with any driver, no runtime magic

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
