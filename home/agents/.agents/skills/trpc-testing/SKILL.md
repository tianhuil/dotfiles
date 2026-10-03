---
name: trpc-testing
description: Choose and implement tests for tRPC procedures and React clients. Use when testing tRPC routers with createCaller, or React, Storybook, and browser flows with MSW or msw-trpc.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: api-testing
---

# Testing tRPC

Choose test seam by behavior under test:

- **Backend procedure tests:** use `createCaller` to execute the real router procedure with a test context. This tests procedure logic and middleware without HTTP or React.
- **React component tests:** use MSW when you want real tRPC hooks and client transport to issue requests against mocked responses. In Vitest/Jest + React Testing Library, MSW uses `setupServer` in Node; RTL usually runs with a simulated DOM, not a browser.
- **Storybook or browser tests:** reuse MSW handlers with `setupWorker` in the browser. Playwright also provides route mocking.

References:

- [tRPC Server-side calls](https://trpc.io/docs/server/server-side-calls) — use for router-level tests and same-server calls; covers caller creation, context, and middleware execution. Do not call one procedure from another; extract shared logic instead.
- [`msw-trpc` README](https://github.com/maloguertin/msw-trpc#readme) — use to author MSW handlers from `AppRouter` procedure paths and inferred input/output. Read for setup, config, and supported versions.

## Backend tests with `createCaller`

```typescript
import { appRouter } from '~/server/api/routers/_app';
import { createTestContext } from '~/server/api/test-context';

test('lists posts for requested limit', async () => {
  const ctx = createTestContext({ posts: [{ id: 'p1', title: 'Test' }] });
  const caller = appRouter.createCaller(ctx);

  await expect(caller.post.list({ limit: 1 })).resolves.toEqual([
    { id: 'p1', title: 'Test' },
  ]);
});
```

`createTestContext` is project-specific: satisfy the router's context type with controlled dependencies. `createCaller` does not start a server or make HTTP requests. Use it to test validation, authorization, business logic, and database interactions through the procedure.

## Frontend tests with MSW

MSW defines responses for intercepted HTTP requests. `setupServer` intercepts requests in the Node test process; it does not listen on a port. `setupWorker` uses a Service Worker in a real browser.

`msw-trpc` is an optional community adapter. It creates MSW handlers from `AppRouter` types; it does not execute the server router. MSW performs interception, while the adapter provides tRPC procedure paths and input/output typing. Its README documents MSW v2, tRPC server v11, and no batching support. The current config API takes tRPC `links` and optional `transformer`; verify compatibility with your installed versions.

```typescript
// tests/mocks/trpc.ts
import { httpLink } from '@trpc/client';
import { createTRPCMsw } from 'msw-trpc';
import superjson from 'superjson';
import type { AppRouter } from '~/server/api/routers/_app';

export const trpcMsw = createTRPCMsw<AppRouter>({
  links: [httpLink({ url: 'http://localhost/api/trpc' })],
  transformer: superjson,
});
```

The endpoint and transformer must match the frontend tRPC client. Handler callback API shown in the project README returns data directly:

```typescript
// tests/mocks/handlers.ts
import { trpcMsw } from './trpc';

export const handlers = [
  trpcMsw.post.list.query((input) => {
    // input is inferred from AppRouter['post']['list'].
    return [{ id: 'p1', title: 'Test' }];
  }),
  trpcMsw.post.create.mutation((input) => ({
    id: 'p2',
    title: input.title,
  })),
];
```

Procedure path, query/mutation kind, input, and result are typed from `AppRouter`. Invalid paths or incompatible mock results fail type-checking. This checks mocks against the declared contract, not their realism or the server implementation. Use `createCaller` for server behavior. Examples using `req`, `res`, and `ctx.data(...)` are not the current README API.

Register handlers with MSW and reset test overrides between tests:

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// vitest.setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './tests/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Render with the normal tRPC and TanStack Query providers and a fresh `QueryClient` per test. Disable query retries for deterministic error tests. Override a handler with `server.use(...)` for one scenario; `resetHandlers()` removes overrides after each test.
