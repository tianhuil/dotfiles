---
name: verification-strategy
description: Prove each behavior with the cheapest check that can catch its bug (types, Unit Tests, lint rules, Component Tests, then e2e) and attach evidence to the PR. Use when planning, writing, reviewing, or moving tests, when a design or task needs a verification plan, when a PR needs evidence, or when a test needs a Postgres database.
---

# Verification Strategy

Verify each behavior with the cheapest check that proves it. The goals:

- **Fast**: quick local feedback and cheap CI.
- **Concise**: no more tests than needed.
- **Correct**: the code works as intended.

Terms used below:

- **Unit Test**: a test that runs in-process, in seconds, with no Docker, no network and no running app. It may use fakes and an in-memory database.
- **Component Test**: a React Testing Library test that renders front-end components together in-process, with the server mocked.
- **Wiring Test**: an e2e test through the real stack (browser, proxy, server, database). It proves the parts are connected, not that the logic is right. Each one is slow and costs CI minutes, so each must earn its place.

## 1. Place each behavior on the waterfall

For each behavior, take the first rung that can prove it:

1. **Types.** Narrow types and functional code catch first-order bugs with no test at all. A state the type system cannot express needs no test.
   - **Narrow types**: type each value as tightly as it really is. Use literal unions (`'draft' | 'sent'`) over `string`, discriminated unions over bags of optional fields, and branded IDs (`UserId`) over raw strings, so a mixed-up argument fails to compile.
   - **No escape hatches**: no `as any`, `as unknown as T`, or non-null `!`. Parse unknown input (requests, env, JSON) with a schema such as Zod at the boundary, so everything inside is typed.
   - **Exhaustive switches**: end a `switch` over a union with a `never` check. Adding a case then breaks the build until every switch handles it.
   - **`const` and array methods**: build values with `.map`, `.filter` and `.flatMap` instead of `let` and loops. Each step's type is checked, and there is no mutable state to get wrong.
2. **Unit Test.** Types prove shape, not decisions. Test logic whose result depends on runtime values:
   - **Nested `if`s and early returns**: each path through them is one case.
   - **Boolean logic** (`||`, `&&`, `!`): a wrong operator or a missed negation still type-checks.
   - **Boolean conditions in DB queries**: `where` clauses that combine `and`, `or` and `not`. Run them against real Postgres with PGlite (step 3).
   - **Loops and `let`**: off-by-one errors, empty input, early `break`, and accumulator state.

   See steps 2–4.
3. **Lint rule.** Ban a whole class of code that type-checks and is normally valid, but is wrong in this codebase.
   - **When**: the bug is a pattern that can appear anywhere, so one rule beats a test at every call site. Example: comparing Mongo ObjectIds with `===` is always false for two instances; require `.equals()`.
   - **How**: write a [Biome plugin](https://biomejs.dev/linter/plugins/) in TypeScript, with types from `@biomejs/runtime`; it can read the file's semantic model. The JS/TS plugin format is a developer preview. For a pure syntax pattern, use GritQL instead.
   - **Message**: the diagnostic names the fix ("compare ObjectIds with `.equals()`"), not just the ban.
4. **Component Test.** Front-end behavior that only shows up when components render together.
   - **What**: a form submit calls the right mutation; loading, error and empty states render; a user event changes what is shown.
   - **Query like a user**: find elements by role and label text rather than test IDs or class names, so the test survives markup refactors.
   - **Mock the server, not the hooks**: for a Component Test, intercept at the network boundary with the `trpc-testing` skill (MSW or msw-trpc). This proves component behavior without pretending to prove the real server; use a Wiring Test for that.
   - **Pull logic out**: extract formatting and derived state into pure functions and give them Unit Tests instead.
5. **Wiring Test.** Only for behavior that lives between processes, where no fake can stand in:
   - a route reaches its handler
   - a proxy forwards or blocks a request
   - a cookie survives a real browser across origins
   - a WebSocket upgrades
   - the app boots with its real config

   See step 5.

Done when every behavior has exactly one home, and each Wiring Test states in one line why no earlier rung can prove it.

## 2. Refactor for testability

When logic is hard to reach from a Unit Test, change the code's shape, never its behavior:

- **Extract pure functions** for decisions: `safeNext(next)`, `needsRefresh(token, now)`, `missingTokenAction(env)`.
- **Split each handler into a core and a wrapper**: `core(req, deps) -> Response` holds the logic; the framework route is a one-line wrapper that builds `deps`.
- **Inject dependencies** (`db`, auth client, `fetch`, `now`) as parameters with production defaults, so existing callers keep working.
- **Read config in one module**; tests vary it with stubs (for example `vi.stubEnv`), not by mutating `process.env`.
- **Pass time in** as a value or as data (an `expires_at` already in the past), rather than faking clocks.

Land the refactor as its own change with test files untouched. The existing suite passing unchanged is the proof that behavior held.

## 3. Use PGlite for Postgres

When a Unit Test needs Postgres, use [PGlite](https://pglite.dev/docs/) (`@electric-sql/pglite`): [real Postgres compiled to WASM](https://pglite.dev/docs/about), running in-process with `new PGlite()`. Prefer it over [pg-mem](https://github.com/oguimbal/pg-mem), which is a partial emulator: its own SQL parser, no timezones, JS numbers for every numeric type, no extensions. PGlite runs the same SQL as production; pg-mem can pass a test that Postgres would fail.

- **One instance per test file** (`beforeAll`), migrations applied once, tables emptied before each test. Cold start takes seconds, so never create one per test.
- **Use the app's real migrations and data layer**, for example Drizzle via [`drizzle-orm/pglite`](https://orm.drizzle.team/docs/connect-pglite) with the app's `Db` type passed in as a dependency.
- **Stay on the query builder** rather than raw `execute`, whose result shapes differ between PGlite and node-postgres.
- **Match the major Postgres version** between PGlite and the production image.
- **Move rows, not clocks**: Postgres `now()` ignores fake timers, so put timestamps in the past instead.

## 4. Write Unit Tests for complex logic

Spend Unit Tests where bugs hide: branching rules, parsing and validation, permission and security decisions, state transitions, boundaries, and data transforms. Glue with no decisions in it (getters, pass-throughs, framework config) is already covered by the type checker or a Wiring Test.

Cover each rule's branches, one test per meaningful case, named after the rule. A good check fails when its rule is broken: before finishing, break the rule once (make the check return `true`, skip the compare) and confirm the test goes red. For a lint rule, confirm it flags a sample violation.

## 5. Keep Wiring Tests few and on the happy path

A Wiring Test walks the main path a real user takes and asserts it arrives. Add a failure-mode Wiring Test only when that failure is the point of the app and only the real stack can enforce it: an auth gate that must block a request at the proxy, a security header the browser must honor. Keep these to a handful.

A Wiring Test may assert exact responses on its path, but leaves rule variants (every error code, every bad input) to Unit Tests.

## 6. Move checks up the waterfall, never drop them

When a check sits on a later rung than it needs (an e2e test that checks logic, a Unit Test a narrower type would make impossible), move it: add the earlier check and remove the later one in the same change, and list old check → new check in the PR description.

## 7. Attach evidence to the PR

1. **CI**: passing tests are the first evidence the PR does what it claims.
2. **UI change**: a Storybook story for each variant, with a screenshot of each on the PR.
3. **CLI change**: run the happy path(s) and paste the command and output into the PR.

## 8. Treat mocking as a test smell

- A test that only passes because of its mock usually tests the mock, not the system. If it relies on mocked server, database, browser, transport, or configuration behavior, move it to a **Wiring Test** and use real dependencies wherever practical. Do not make the mock more elaborate to preserve it.
- Exceptions are narrow: use mocks or fakes for unavailable third-party services, nondeterministic inputs, or failure paths the real dependency cannot safely produce. Keep the mocked contract small and test the integration with at least one real-stack path when feasible.
- **Move in both directions**: migrate mock-dependent integration tests to Wiring Tests; migrate Wiring Tests that mostly check branching, parsing, validation, permissions, state transitions, or data transforms to Unit Tests. Extract pure logic, unit-test its rules, and retain only a thin Wiring Test for connection proof.

## 9. Miscellaneous rules

- Do not test whether a file is Git-committed, whether a path appears in Git status, or any other incidental Git state. Those checks test the checkout, not application behavior. If code intentionally integrates with Git, test its observable behavior using controlled fixture repositories or an explicit Git boundary.
