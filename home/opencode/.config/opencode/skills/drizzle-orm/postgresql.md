# PostgreSQL Features

Drizzle ORM provides comprehensive PostgreSQL-specific features and optimizations.

## Identity Columns

Replace deprecated `serial` with recommended `identity`:

```typescript
import { pgTable, integer, generatedAlwaysAsIdentity, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity({
    startWith: 1000
  }),
  name: text('name').notNull(),
});
```

## Sequences

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

## Generated Columns

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

## Row-Level Security (RLS)

Mark tables with RLS enabled:

```typescript
// NEW syntax
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable.withRLS('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

// OLD syntax (deprecated)
export const usersOld = pgTable('users', {}).enableRLS();
```

## Cloud Database Connections

Drizzle supports PostgreSQL cloud databases with dedicated driver packages:

### Installation

```bash
npm install @neondatabase/serverless  # Neon
npm install @vercel/postgres      # Vercel
npm install @aws-sdk/client-rds-data-api
npm install @prisma/postgres
npm install @supabase/postgres-js2
npm install @xata/client
npm install @effect/postgres
```

### Usage Examples

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

// Supabase
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
```

## PostgreSQL-Specific Types

```typescript
import { pgTable, text, jsonb, array, numeric } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  // JSONB column
  metadata: jsonb('metadata').$type<{ tags: string[] }>(),
  // Array column
  tags: array(text('tags')),
  // Numeric for precise decimal values
  price: numeric('price', { precision: 10, scale: 2 }),
});
```

## Indexes

```typescript
import { pgTable, text, serial, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  emailUnique: uniqueIndex('email_unique').on(table.email),
}));
```
