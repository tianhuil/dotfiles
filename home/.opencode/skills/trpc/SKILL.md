---
name: trpc
description: Develops end-to-end typesafe APIs with tRPC v11, including server setup, client integration, middleware, Next.js App Router patterns, router merging, and testing. Use when building or modifying tRPC-based APIs.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: api-development
---

# tRPC v11 Development

## Core Principles

- **End-to-end type safety** - types flow from server to client automatically
- **Zero code generation** - no schemas or build steps required
- **Context-driven architecture** - pass user auth, database, and other per-request data through context
- **Modular routers** - organize related procedures into sub-routers
- **Middleware for auth and logging** - reuse logic across procedures with `.use()`
- **Next.js App Router first** - leverage server components with hydration helpers
- **SuperJSON transformer** - handle Dates, BigInt, and other non-JSON types

## Quick Reference

### Project Structure
```
server/
├─ api/
│  ├─ trpc.ts           # initTRPC, context, base procedures
│  └─ routers/
│     ├─ _app.ts         # Root router (merge all routers)
│     ├─ post.ts         # Feature-specific router
│     └─ user.ts
├─ trpc/
│  ├─ server.ts          # createHydrationHelpers (server-only)
│  ├─ client.ts          # createTRPCClient (client-only)
│  ├─ provider.tsx      # TRPCProvider wrapper
│  └─ react.ts         # React hooks exports
app/
└─ api/
   └─ trpc/
      └─ [trpc]/route.ts # fetchRequestHandler
```

### File Operations
- **Read before editing** - ALWAYS use `read` tool first
- Use `write` for new files, `edit` for targeted changes
- Include change comments: `// <CHANGE> adding protected procedure`

## Server Setup

### Initialize tRPC with Context
```typescript
import { initTRPC } from '@trpc/server';
import { cache } from 'react';

// Create context with React cache for RSC compatibility
export const createTRPCContext = cache(async () => {
  return { userId: 'user_123' };
});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson, // Optional: for Date, BigInt, etc.
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
```

### Base Procedures
```typescript
// Public procedure (no auth required)
export const publicProcedure = baseProcedure;

// Protected procedure (requires auth)
export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: { session: ctx.session } // Infer session as non-null
  });
});

// Admin procedure (requires admin role)
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

### Define Procedures with Zod Validation
```typescript
import { z } from 'zod';

export const postRouter = t.router({
  // Query - read data
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      return ctx.db.post.findMany({ take: input.limit });
    }),

  // Mutation - modify data
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(2).max(100),
      content: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.post.create({
        data: { ...input, userId: ctx.session.user.id }
      });
    }),
});
```

## Client Setup

### Create tRPC Client (TanStack Query)
```typescript
import { httpBatchLink } from '@trpc/client';
import { createTRPCClient, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '~/server/api/root';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpcClient: TRPCClient<AppRouter> = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers: () => ({ authorization: `Bearer ${getAuthToken()}` }),
    }),
  ],
});
```

### React Hooks with TanStack Query
```typescript
import { createTRPCContext } from '@trpc/react-query';
import type { AppRouter } from '~/server/api/root';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

// Use in components
const trpc = useTRPC();
const { data, isLoading, error } = trpc.post.list.useQuery({ limit: 10 });

const createMutation = trpc.post.create.useMutation({
  onSuccess: () => {
    toast({ title: 'Post created!' });
    trpc.post.list.invalidate(); // Refetch
  },
});
```

## Next.js App Router Integration

### Server Components with Hydration
```typescript
// server/trpc/server.ts (server-only)
import 'server-only';
import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { cache } from 'react';
import { createCallerFactory, createTRPCContext } from './trpc';
import { createQueryClient } from './query-client';
import { appRouter } from './routers/_app';

const getQueryClient = cache(createQueryClient);
const caller = createCallerFactory(appRouter)(createTRPCContext);

export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  caller,
  getQueryClient,
);
```

### Prefetch and Hydrate
```typescript
// app/page.tsx (Server Component)
import { HydrateClient, trpc } from '~/trpc/server';

export default async function HomePage() {
  // Prefetch on server
  await trpc.post.list.prefetch({ limit: 10 });

  return (
    <HydrateClient>
      <ClientPostList />
    </HydrateClient>
  );
}
```

### Client Component Usage
```typescript
// components/post-list.tsx (Client Component)
'use client';
import { trpc } from '~/trpc/client';

export function ClientPostList() {
  const { data, isLoading } = trpc.post.list.useQuery({ limit: 10 });

  if (isLoading) return <Skeleton />;
  return <PostList posts={data} />;
}
```

## Route Handler (API Endpoint)

### Next.js App Router
```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';
import { createTRPCContext } from '~/server/api/trpc';
import { appRouter } from '~/server/api/routers/_app';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext(req),
  });

export { handler as GET, handler as POST };
```

## Router Merging

### Merge Sub-routers
```typescript
// server/api/routers/_app.ts
import { mergeRouters, publicProcedure } from '../trpc';
import { postRouter } from './post';
import { userRouter } from './user';

export const appRouter = mergeRouters(
  postRouter,
  userRouter,
);

export type AppRouter = typeof appRouter;
```

### Feature Router Example
```typescript
// server/api/routers/post.ts
import { publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const postRouter = {
  list: publicProcedure.query(() => /* ... */),
  create: protectedProcedure.mutation(() => /* ... */),
  byId: publicProcedure.input(z.string()).query(() => /* ... */),
};
```

## Server-Side Calls

### Create Caller for Background Jobs/Tests
```typescript
import { createCallerFactory } from '~/server/api/trpc';
import { appRouter } from './routers/_app';

const createCaller = createCallerFactory(appRouter);

// Use in server code
const caller = createCaller({ userId: 'system-user' });
const posts = await caller.post.list({ limit: 5 });
```

### Integration Testing
```typescript
import { createCallerFactory, createTRPCContext } from './trpc';
import { appRouter } from './routers/_app';
import { inferProcedureInput } from '@trpc/server';

test('create and retrieve post', async () => {
  const ctx = await createTRPCContext();
  const caller = createCallerFactory(appRouter)(ctx);

  const input: inferProcedureInput<AppRouter['post']['create']> = {
    title: 'Test Post',
  };

  const post = await caller.post.create(input);
  const retrieved = await caller.post.byId({ id: post.id });

  expect(retrieved).toMatchObject(input);
});
```

## Middleware Patterns

### Timing Middleware
```typescript
import { middleware } from './trpc';

export const timingMiddleware = middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  console.log(`[tRPC] ${path} took ${duration}ms`);
  return result;
});

export const publicProcedure = baseProcedure.use(timingMiddleware);
```

### Logging Middleware
```typescript
export const loggerMiddleware = middleware(({ next, ctx }) => {
  console.log(`User: ${ctx.session?.user?.id ?? 'anonymous'}`);
  return next();
});
```

### Compose Middleware
```typescript
export const protectedProcedure = baseProcedure
  .use(timingMiddleware)
  .use(loggerMiddleware)
  .use(authMiddleware);
```

## Error Handling

### Throw TRPC Errors
```typescript
import { TRPCError } from '@trpc/server';

throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Post not found',
});

throw new TRPCError({
  code: 'UNAUTHORIZED',
  cause: originalError, // For debugging
});
```

### Error Codes
- `INTERNAL_SERVER_ERROR` - Unexpected server errors
- `BAD_REQUEST` - Invalid input
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Authenticated but not permitted
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Resource state conflict

## React Query Integration

### useMutation with Optimistic Updates
```typescript
const createPost = trpc.post.create.useMutation({
  onMutate: async (newPost) => {
    // Cancel outgoing refetches
    await trpc.post.list.cancel();

    // Snapshot previous value
    const previous = trpc.post.list.getData();

    // Optimistically update
    trpc.post.list.setData(undefined, (old) => [
      ...(old || []),
      { ...newPost, id: 'temp' },
    ]);

    return { previous };
  },
  onError: (err, newPost, context) => {
    // Rollback on error
    trpc.post.list.setData(undefined, context.previous);
  },
  onSuccess: () => {
    trpc.post.list.invalidate();
  },
});
```

### Infinite Queries (Pagination)
```typescript
const posts = trpc.post.infinite.useInfiniteQuery(
  { limit: 10 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  },
);

// Load more
const loadMore = () => posts.fetchNextPage();
```

## Data Transformers

### SuperJSON Setup
```typescript
import superjson from 'superjson';

const t = initTRPC.create({
  transformer: superjson,
});
```

### Benefits
- **Dates**: `Date` objects preserved (not stringified)
- **BigInt**: Support for large numbers
- **Map/Set**: Complex data structures
- **Error objects**: Stack traces and custom errors

## Testing Patterns

### Mock Context for Tests
```typescript
const createMockContext = async () => {
  return {
    session: { user: { id: 'test-user', role: 'user' } },
    db: mockDatabase,
  };
};

const caller = createCallerFactory(appRouter)(await createMockContext());
```

## Best Practices Checklist

### Server Setup
- [ ] Use React's `cache()` for context creation (RSC compatible)
- [ ] Export `AppRouter` type for client-side type safety
- [ ] Use Zod for all input/output validation
- [ ] Define base procedures (public, protected, admin)
- [ ] Apply SuperJSON transformer for complex types

### Router Organization
- [ ] Group related procedures into feature routers
- [ ] Use `mergeRouters` to combine routers
- [ ] Keep routers focused and single-responsibility
- [ ] Export types for reuse (`inferProcedureInput`)

### Client Integration
- [ ] Use `httpBatchLink` for efficient batching
- [ ] Prefetch queries in server components when possible
- [ ] Use `HydrateClient` to pass prefetched data
- [ ] Implement proper error boundaries

### Error Handling
- [ ] Use appropriate TRPCError codes
- [ ] Include cause for debugging
- [ ] Log errors with context (user, procedure path)
- [ ] Provide user-friendly error messages

### Performance
- [ ] Enable batching with `httpBatchLink`
- [ ] Use React Query's caching and deduplication
- [ ] Prefetch critical data in server components
- [ ] Implement optimistic updates for mutations

## Common Patterns

### Input/Output Type Inference
```typescript
import { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

type CreatePostInput = inferProcedureInput<AppRouter['post']['create']>;
type PostListOutput = inferProcedureOutput<AppRouter['post']['list']>;
```

### Meta for Documentation
```typescript
export const appRouter = t.router({
  create: t.procedure
    .meta({ openapi: { method: 'POST', path: '/posts' } })
    .input(postSchema)
    .mutation(/* ... */),
});
```

## Anti-Patterns to Avoid

### ❌ Don't use `.use()` without error handling
```typescript
// Bad
const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new Error('Not logged in'); // Not a TRPCError!
  }
  return next({ ctx });
});

// Good
const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});
```

### ❌ Don't ignore context type safety
```typescript
// Bad
const procedure = baseProcedure.use(({ ctx, next }) => {
  return next({ ctx }); // TypeScript won't catch issues
});

// Good
const procedure = baseProcedure.use(({ ctx, next }) => {
  return next({ ctx: { ...ctx, extra: 'data' } });
});
```

### ❌ Don't bypass validation
```typescript
// Bad
.create(async ({ input }) => {
  return createPost(input); // No validation!
})

// Good
.create(
  z.object({ title: z.string() }), // Validate first
  async ({ input }) => {
    return createPost(input);
  }
)
```

---

## Quick Start Commands

### Initialize tRPC in Next.js
```bash
# Using create-t3-app (recommended)
pnpm create t3-app@latest

# Manual setup
pnpm add @trpc/server @trpc/client @trpc/react-query zod superjson
```

### Install Required Packages
```bash
# Server
pnpm add @trpc/server zod superjson

# Client (Next.js with TanStack Query)
pnpm add @trpc/client @trpc/react-query @trpc/server @tanstack/react-query
```

## Package Dependencies

### Core (Required)
- `@trpc/server` - Server-side tRPC
- `zod` - Input/output validation

### Client Integration
- `@trpc/client` - HTTP client
- `@trpc/react-query` - React Query integration
- `@trpc/server` - Server (for types)
- `@tanstack/react-query` - Query caching and state

### Optional
- `superjson` - Data transformer for Dates, BigInt
- `@trpc/server-adapters` - Platform adapters
