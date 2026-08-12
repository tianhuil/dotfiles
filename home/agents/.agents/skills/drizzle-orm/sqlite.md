# SQLite Features

Drizzle ORM provides comprehensive SQLite-specific features and optimizations.

## Auto-Incrementing Primary Keys

```typescript
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});
```

## Foreign Keys

```typescript
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id),
});
```

## Timestamps

SQLite doesn't have native timestamp types, use integers with mode conversion:

```typescript
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Stores as integer Unix timestamp (seconds)
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  // Stores as integer Unix timestamp (milliseconds)
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$onUpdate(() => new Date()),
});
```

## Full-Text Search (FTS5)

```typescript
import { fts5Table } from 'drizzle-orm/sqlite-core';

export const postsFts = fts5Table('posts_fts', {
  content: text('content'),
  title: text('title'),
});
```

## Cloud Database Connections (Turso/libsql)

### Installation

```bash
npm install @libsql/client  # Turso/libsql
```

### Usage Examples

```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

// Local SQLite file
const client = createClient({ url: 'file:local.db' });
const db = drizzle({ client });

// Turso cloud database
const client = createClient({
  url: 'libsql://my-project.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle({ client });
```

## Better-SQLite3 Driver

For local SQLite with better performance and synchronous API:

### Installation

```bash
npm install better-sqlite3
```

### Usage

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('local.db');
const db = drizzle(sqlite);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');
```

## SQLite-Specific Features

### Enable Foreign Keys

Foreign keys are disabled by default in SQLite:

```typescript
import Database from 'better-sqlite3';

const sqlite = new Database('local.db');
sqlite.pragma('foreign_keys = ON');
```

### Pragmas for Optimization

```typescript
// Enable WAL mode (better concurrency)
sqlite.pragma('journal_mode = WAL');

// Increase cache size (default is 2000 pages)
sqlite.pragma('cache_size = -10000');  // 10MB

// Optimize for speed
sqlite.pragma('synchronous = NORMAL');
```

### SQLite Constraints

```typescript
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  age: integer('age'),
}, (table) => ({
  // Composite unique constraint
  uniqueEmailName: unique('unique_email_name').on(table.email, table.name),
}));
```

## SQLite Data Types

SQLite uses dynamic typing, but Drizzle provides type safety:

```typescript
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Float/double precision
  price: real('price'),
  // Binary data
  data: blob('data'),
  // Custom type mapping
  metadata: text('metadata').$type<{ key: string }>(),
});
```

## Common SQLite Patterns

### Upsert (Insert or Update)

```typescript
await db.insert(users)
  .values({ name: 'John', email: 'john@example.com' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'John Updated' },
  });
```

### Insert or Ignore

```typescript
await db.insert(users)
  .values({ name: 'John', email: 'john@example.com' })
  .onConflictDoNothing();
```

### Return inserted data

```typescript
const result = await db.insert(users)
  .values({ name: 'John', email: 'john@example.com' })
  .returning();
```
