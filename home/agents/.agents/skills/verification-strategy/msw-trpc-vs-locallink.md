# msw-trpc vs localLink in Component Tests

Use **msw-trpc** when the test asks "given this response, does the UI do the right thing?" Use **`localLink`** when the answer depends on what the real procedure does. If it depends on HTTP, cookies, headers or batching, neither one fits; write a Wiring Test.

- **msw-trpc** returns typed, canned responses. It is fast and makes any state easy to set up, and the same handlers work in Storybook. It proves nothing about the server.
- **`localLink`** runs the real router in the test process. It proves that the procedure and the UI work together. In exchange, the test must provide the router's dependencies (context, a PGlite database, seed data), and it skips HTTP entirely.

## How each one works

| | msw-trpc | `localLink` |
| --- | --- | --- |
| Where the call ends | The app's real `httpLink` sends a `fetch`. MSW (`setupServer`) intercepts it, and a typed handler returns data. | A terminating link from `@trpc/client` calls the router directly. There is no `fetch`. |
| What runs on the "server" | Your handler function. The router never runs. | The real router: middleware, input validation, the procedure and error formatting. |
| Package | Community package `msw-trpc` 2.0.1, last published July 2025. Peer dependencies: `msw` ^2 and `@trpc/server` ^11. | First-party. It was called `unstable_localLink` until `@trpc/client` 11.23.0. That name and `experimental_localLink` are still exported but deprecated. |

## Tradeoffs

| Concern | msw-trpc | `localLink` |
| --- | --- | --- |
| **What it proves about the server** | Nothing. The handler's types match the router's, so the data has the right shape, but the values can still be unrealistic. | The real procedure's output, validation errors and authorization decisions, as the UI receives them. |
| **Risk of the test passing while the app is broken** | High when handlers hold logic (filtering, state across a mutation and a refetch). The test then checks the mock. | Low for procedure logic. The faked parts are now the context and dependencies you pass in. |
| **Setup cost** | One handler for each procedure the screen calls, plus the MSW server lifecycle. | A `createContext` that returns test dependencies, usually a PGlite database with migrations and seed data. Server code also gets imported into the simulated-DOM test environment. |
| **Speed** | Fast. No database. | Slower. Starting PGlite and running migrations take seconds for each file. |
| **Edge states** (slow loading, empty lists, odd data, 500 errors) | Easy. Return any data, `await delay(...)`, or throw `TRPCError` to get a tRPC error with its HTTP status. Use a plain MSW `http` handler to simulate a network failure. | Hard. You have to set up real state, or inject a dependency that hangs or throws. A network failure cannot happen. |
| **Client HTTP stack** | Exercised: the real `httpLink`, URL, query or POST encoding, transformer serialization, and mapping HTTP status codes to errors. | Skipped: no URL, headers, cookies, HTTP status, batching or response metadata. |
| **Serialization** | Real. Data goes through the transformer and JSON as it would over the network. | Partial. Input is passed as-is. Output is round-tripped through JSON only when no transformer is set. With a transformer such as superjson, results are passed by reference, so values that would break on the network (class instances, shared mutable objects) can still pass the test. |
| **Batching** | Not supported. Tests must use `httpLink`, even if production uses `httpBatchLink`. | Not applicable, because the link replaces the whole transport. |
| **Subscriptions** | Not supported. Handlers exist only for queries and mutations. | Supported, including `tracked()` event IDs. It does not send the `stopped` event. |
| **Overriding one test** | `server.use(handler)`. Reset with `server.resetHandlers()`. | Seed different rows, or pass different dependencies to `createContext`. |
| **Reuse outside Vitest** | Same handlers in Storybook or the browser through `setupWorker`. | Node only. Running the router and its database in a browser story is not practical. |
| **Maintenance** | A third-party adapter that has to keep up with MSW and tRPC releases. | Ships with tRPC and has had a stable name since 11.23.0. |

## Choosing

1. **The assertion is about rendering given a response** (states, formatting, which button is enabled, how an error is shown): **msw-trpc**. The component's contract is its reaction to data, so the mock is the input, not the thing under test.
2. **The assertion depends on server behavior** (a Zod error message appears, a user without access sees a denial, a created item shows up after the refetch): **`localLink` + PGlite**. Reproducing this in MSW handlers means building a fake server, which is the mock smell in section 4 of [SKILL.md](./SKILL.md).
3. **Subscriptions**: **`localLink`**.
4. **The screen also needs Storybook stories**: **msw-trpc**, so stories and tests share one set of handlers.
5. **The behavior needs HTTP** (cookies, auth headers, batching, the route URL, a proxy): neither. Write a **Wiring Test**.
6. **The procedure's logic is the real subject**: test it with `createCaller` as a Unit Test (see the `trpc-testing` skill). Then render with whichever link rule 1 or 2 selects, and keep that test about the UI.

Choose one per test file. Both setups plug into the same test wrapper, because the wrapper only changes the client's `links`.

## Setup sketch: `localLink`

```tsx
import { createTRPCClient, localLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import superjson from 'superjson';
import { appRouter, type AppRouter } from '~/server/api/routers/_app';
import { TRPCProvider } from '~/trpc/react'; // from createTRPCContext<AppRouter>()

export function renderWithRouter(ui: React.ReactElement, ctx: TestContext) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const trpcClient = createTRPCClient<AppRouter>({
    // Required when the router uses a transformer; must match the router's.
    links: [localLink({ router: appRouter, transformer: superjson, createContext: async () => ctx })],
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>{ui}</TRPCProvider>
    </QueryClientProvider>,
  );
}
```

`TestContext` is the router's context with test dependencies, for example a Drizzle `db` on PGlite ("Use PGlite for Postgres" in section 5 of [SKILL.md](./SKILL.md)). The msw-trpc setup is in the `trpc-testing` skill.

## Sources

Accessed 2026-11-16.

- [tRPC docs: localLink](https://trpc.io/docs/client/links/localLink)
- `@trpc/client` 11.28.3 published source (`dist/index.mjs`, `localLink`): how transformers and input are handled, subscription support. 11.22.1 compared with 11.23.0 for when the name changed.
- [msw-trpc README](https://github.com/maloguertin/msw-trpc#readme): no batching support, config API.
- `msw-trpc` 2.0.1 published source (`dist/types.d.ts`, `dist/handler.js`): handlers only for queries and mutations, how `TRPCError` becomes an HTTP status. npm metadata for the publish date and peer dependencies.
