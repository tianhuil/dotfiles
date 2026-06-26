---
name: trpc
description: Develops end-to-end typesafe APIs with tRPC v11 in Next.js applications, including client setup, App Router patterns, React Query integration, middleware, router merging, and testing. Use when building or modifying tRPC-based APIs in Next.js.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: api-development
---

# tRPC v11 for Next.js

## Core Principles

- **End-to-end type safety** - types flow from server to client automatically
- **Next.js App Router first** - leverage server components with hydration helpers
- **React Query integration** - use `@trpc/react-query` with TanStack Query v5
- **Prefetch in server, hydrate on client** - minimize waterfalls and data-fetching time
- **Modular routers** - organize related procedures into sub-routers
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
server/trpc/
├─ server.ts             # createHydrationHelpers (server-only)
├─ client.ts            # createTRPCClient (client-only)
└─ provider.tsx         # TRPCProvider wrapper
app/
└─ api/
   └─ trpc/
      └─ [trpc]/route.ts # fetchRequestHandler
```

### File Operations
- **Read before editing** - ALWAYS use `read` tool first
- Use `write` for new files, `edit` for targeted changes
- Include change comments: `// <CHANGE> adding protected procedure`

## Client Setup

### Create tRPC Client with TanStack Query
```typescript
// server/trpc/client.ts
import { httpBatchLink } from '@trpc/client';
import { createTRPCClient } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';
import type { AppRouter } from '~/server/api/root';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.RENDER_INTERNAL_HOSTNAME) return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: use singleton pattern
  return (clientQueryClientSingleton ??= makeQueryClient());
};

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          async headers() {
            const headers = new Headers();
            // Add auth headers
            const token = await getAuthToken();
            if (token) headers.set('authorization', `Bearer ${token}`);
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
```

### Use in Layout
```typescript
// app/layout.tsx
import { TRPCProvider } from '~/server/trpc/client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
```

## Server Components with Hydration

### Setup Hydration Helpers
```typescript
// server/trpc/server.ts (server-only)
import 'server-only';
import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { headers } from 'next/headers';
import { cache } from 'react';
import { createCallerFactory, createTRPCContext } from '../api/trpc';
import { makeQueryClient } from './client';
import { appRouter } from '../api/routers/_app';

const getQueryClient = cache(makeQueryClient);
const caller = createCallerFactory(appRouter)(createTRPCContext);

export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  caller,
  getQueryClient,
);
```

### Prefetch and Hydrate Pattern
```typescript
// app/posts/page.tsx
import { HydrateClient, trpc } from '~/server/trpc/server';
import { PostList } from './post-list';

export default async function PostsPage() {
  // Prefetch data in server component
  void trpc.post.list.prefetch({ limit: 10 });

  return (
    <HydrateClient>
      <PostList />
    </HydrateClient>
  );
}
```

### Client Component Usage
```typescript
// components/post-list.tsx
'use client';
import { trpc } from '~/server/trpc/client';

export function PostList() {
  const { data, isLoading, error } = trpc.post.list.useQuery({ limit: 10 });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

## Route Handler

### Next.js App Router Setup
```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';
import { appRouter } from '~/server/api/routers/_app';
import { createTRPCContext } from '~/server/api/trpc';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext(req),
  });

export { handler as GET, handler as POST };
```

## React Query Hooks

### useQuery
```typescript
const { data, isLoading, error, refetch } = trpc.post.list.useQuery({
  limit: 10,
  {
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  }
});
```

### useMutation
```typescript
const createPost = trpc.post.create.useMutation({
  onSuccess: (data) => {
    toast({ title: 'Post created!', description: data.title });
    trpc.post.list.invalidate(); // Refetch list
  },
  onError: (error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});

<button onClick={() => createPost.mutate({ title: 'Hello', content: 'World' })}>
  Create Post
</button>
```

### Optimistic Updates
```typescript
const updatePost = trpc.post.update.useMutation({
  onMutate: async (updatedPost) => {
    // Cancel outgoing refetches
    await trpc.post.list.cancel();

    // Snapshot previous value
    const previous = trpc.post.list.getData();

    // Optimistically update
    trpc.post.list.setData(undefined, (old) =>
      old?.map(post =>
        post.id === updatedPost.id ? { ...post, ...updatedPost } : post
      )
    );

    return { previous };
  },
  onError: (err, newPost, context) => {
    // Rollback on error
    trpc.post.list.setData(undefined, context.previous);
  },
  onSettled: () => {
    // Always refetch after error or success
    trpc.post.list.invalidate();
  },
});
```

### useInfiniteQuery
```typescript
const posts = trpc.post.infinite.useInfiniteQuery(
  { limit: 10 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  },
);

const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = posts;

<button
  onClick={() => fetchNextPage()}
  disabled={!hasNextPage || isFetchingNextPage}
>
  Load More
</button>
```

## Router Organization

### Merge Sub-routers
```typescript
// server/api/routers/_app.ts
import { mergeRouters } from '../api/trpc';
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
import { protectedProcedure, publicProcedure } from '../api/trpc';
import { z } from 'zod';

export const postRouter = {
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      return ctx.db.post.findMany({ take: input.limit });
    }),

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

  byId: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const post = await ctx.db.post.findUnique({ where: { id: input } });
      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return post;
    }),
};
```

## Context and Middleware

### Base Procedures (Defined in server/api/trpc.ts)
```typescript
import { initTRPC } from '@trpc/server';
import { cache } from 'react';
import { z } from 'zod';
import superjson from 'superjson';
import { TRPCError } from '@trpc/server';

export const createTRPCContext = cache(async () => {
  const session = await getSession();
  return { session };
});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const baseProcedure = t.procedure;

// Public procedure
export const publicProcedure = baseProcedure;

// Protected procedure
export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: { session: ctx.session } // Infer as non-null
  });
});

// Admin procedure
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

### Reusable Middleware Patterns

#### Timing Middleware
```typescript
import { middleware } from '../api/trpc';

const timingMiddleware = middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  console.log(`[tRPC] ${path} took ${duration}ms`);
  return result;
});

export const publicProcedure = baseProcedure.use(timingMiddleware);
```

#### Logging Middleware
```typescript
const loggerMiddleware = middleware(({ next, ctx }) => {
  console.log(`User: ${ctx.session?.user?.id ?? 'anonymous'}`);
  return next();
});
```

#### Compose Multiple Middleware
```typescript
export const protectedProcedure = baseProcedure
  .use(timingMiddleware)
  .use(loggerMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({ ctx: { session: ctx.session } });
  });
```
```typescript
import { initTRPC } from '@trpc/server';
import { cache } from 'react';
import { z } from 'zod';
import superjson from 'superjson';
import { TRPCError } from '@trpc/server';

export const createTRPCContext = cache(async () => {
  const session = await getSession();
  return { session };
});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const baseProcedure = t.procedure;

// Public procedure
export const publicProcedure = baseProcedure;

// Protected procedure
export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: { session: ctx.session } // Infer as non-null
  });
});

// Admin procedure
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

## Server-Side Calls

### Create Caller for Server Actions
```typescript
import { createCallerFactory } from '~/server/api/trpc';
import { appRouter } from './routers/_app';

// Use in server actions or route handlers
const createCaller = createCallerFactory(appRouter);
const caller = createCaller(await createTRPCContext());

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

## Best Practices Checklist

### Client Setup
- [ ] Use `httpBatchLink` for efficient batching
- [ ] Wrap app in `TRPCProvider` and `QueryClientProvider`
- [ ] Use singleton pattern for client-side query client
- [ ] Configure SuperJSON transformer
- [ ] Add auth headers in httpBatchLink

### Server Components
- [ ] Prefetch queries with `trpc.procedure.prefetch()`
- [ ] Wrap client components with `HydrateClient`
- [ ] Use server-only import for `server.ts`
- [ ] Use `cache()` for query client getter

### Client Components
- [ ] Use `'use client'` directive
- [ ] Import trpc from client, not server
- [ ] Implement loading and error states
- [ ] Use optimistic updates for better UX

### React Query Integration
- [ ] Configure `staleTime` appropriately
- [ ] Invalidate queries on mutations with `invalidate()`
- [ ] Use optimistic updates where possible
- [ ] Handle errors with `onError` callbacks

### Router Organization
- [ ] Group related procedures into feature routers
- [ ] Use `mergeRouters` to combine routers
- [ ] Export `AppRouter` type for type inference
- [ ] Use Zod for all input validation

## Common Patterns

### Type Inference
```typescript
import { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

type CreatePostInput = inferProcedureInput<AppRouter['post']['create']>;
type PostListOutput = inferProcedureOutput<AppRouter['post']['list']>;
```

### Invalidate Multiple Queries
```typescript
trpc.utils.invalidate({
  queries: [['post.list'], ['user.profile']],
});
```

### Set Query Data Directly
```typescript
trpc.post.list.setData(undefined, (old) => [
  ...old,
  newPost,
]);
```

## Anti-Patterns to Avoid

### ❌ Don't use .use() without proper error handling
```typescript
// Bad - using generic Error
const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new Error('Not logged in'); // Not a TRPCError!
  }
  return next({ ctx });
});

// Good - using TRPCError
const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});
```

### ❌ Don't ignore context type safety
```typescript
// Bad - TypeScript won't catch missing required properties
const procedure = baseProcedure.use(({ ctx, next }) => {
  // If UserContext requires 'userId', TypeScript won't warn here
  return next({ ctx: { email: 'test@example.com' } });
});

// Good - use spread to preserve existing properties
const procedure = baseProcedure.use(({ ctx, next }) => {
  // Spread ensures all required properties from ctx are preserved
  return next({ ctx: { ...ctx, userId: '123' } });
});

// Even better - type the new context explicitly
type ExtendedContext = typeof ctx & { userId: string };

const typedProcedure = baseProcedure.use(({ ctx, next }) => {
  const newCtx: ExtendedContext = { ...ctx, userId: '123' };
  return next({ ctx: newCtx });
});
```

### ❌ Don't bypass Zod validation
```typescript
// Bad - no validation
const createPost = t.procedure
  .mutation(async ({ input, ctx }) => {
    return ctx.db.post.create({ data: input }); // No validation!
  });

// Good - validate with Zod
const createPost = t.procedure
  .input(z.object({ title: z.string().min(2) }))
  .mutation(async ({ input, ctx }) => {
    return ctx.db.post.create({ data: input });
  });
```

### ❌ Don't prefetch without HydrateClient
```typescript
// Bad - data won't hydrate
export default async function Page() {
  await trpc.post.list.prefetch();
  return <PostList />;
}

// Good
export default async function Page() {
  await trpc.post.list.prefetch();
  return (
    <HydrateClient>
      <PostList />
    </HydrateClient>
  );
}
```

### ❌ Don't use server client in client components
```typescript
// Bad - will break in browser
'use client';
import { trpc } from '~/server/trpc/server';

// Good
'use client';
import { trpc } from '~/server/trpc/client';
```

### ❌ Don't forget to invalidate after mutations
```typescript
// Bad
const createPost = trpc.post.create.useMutation({
  onSuccess: () => {
    toast({ title: 'Created!' });
    // List won't update!
  },
});

// Good
const createPost = trpc.post.create.useMutation({
  onSuccess: () => {
    toast({ title: 'Created!' });
    trpc.post.list.invalidate(); // Refetch list
  },
});
```

## Quick Start Commands

### Initialize tRPC in Next.js
```bash
# Using create-t3-app (recommended)
pnpm create t3-app@latest

# Manual setup
pnpm add @trpc/server @trpc/client @trpc/react-query zod superjson @tanstack/react-query
```

## Package Dependencies

### Core (Required)
- `@trpc/server` - Server-side tRPC
- `@trpc/client` - HTTP client
- `@trpc/react-query` - React Query integration
- `zod` - Input/output validation
- `@tanstack/react-query` - Query caching (v5+)

### Optional
- `superjson` - Data transformer for Dates, BigInt
