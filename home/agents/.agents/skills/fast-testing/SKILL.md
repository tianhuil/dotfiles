---
name: fast-testing
description: Keep tests fast and cheap by preferring unit tests over e2e, and choose where each test belongs. Use when planning, writing, reviewing, or moving tests, when a design or task needs a verification plan, or when a test needs a Postgres database.
---
# TODO

This is the order for preferred testing.  The objective is fast (quick feedback cycles), concise (no more tests than needed), and secure (code functions properly)

## Testing

For all logic you want to test, choose this as waterfall (earlier ones are preferred):

1. Narrow Strong typing + Functional Code to catch first-order bugs: so this is just leveraging the type system rather than writing tests.  Don't use `as any`, make types narrow, use `.map` and `.filter` and `.flatMap` with only `const` no `let`.  This catches logic
2. Unit testing: some things don't test well in. types: nested `if` statements, boolean logic (`||` and `&&`), boolean DB queries, anything with `while` or `for` loops or `let`.
3. Custom lint rules: sometimes we want to disallow entire classes of behavior that are normally fine.  One example was Mongo ObjectIds should be compared with `.equals()` rather than `===.`  Use custom lint rules [https://biomejs.dev/linter/plugins/](https://biomejs.dev/linter/plugins/) in TS.  
4. React Testing Library for component integration testing on front-end. We may need to mock server for testing: refer to this file/home/michael/orca/projects/workspace/dotfiles/home/agents/.agents/skills/trpc-testing/[SKILL.md](http://SKILL.md)
5. E2E tests.  Use this as below (sparingly).  Context listed below.

## Evidence

1. Tests on CI remain the first level of evidence that a PR does as it should.
2. For a UX change: storybook for all UX with screenshot on PR.  Screenshot the different variations and place them onto the PR.
3. If there is a CLI: reproduce the happy path cli run(s) and save the text onto the PR

# Fast Testing

The goal is speed: fast local iteration and cheap CI. Prove logic with Unit Tests that run in seconds. Prove wiring with a few Wiring Tests.

- **Unit Test**: a test that runs in-process, in seconds, with no Docker, no network and no running app. It may use fakes and an in-memory database.
- **Wiring Test**: an e2e test through the real stack (browser, proxy, server, database). It proves the parts are connected, not that the logic is right. Each one is slow and costs CI minutes, so each must earn its place.

## 1. Place each behavior

For each behavior to verify, ask: can it be checked in-process?

- **Yes** → Unit Test. This is the default, including when the code must first be refactored to make it reachable (step 2).
- **No, the behavior lives between processes** → Wiring Test. Examples: a route reaches its handler, a proxy forwards or blocks a request, a cookie survives a real browser across origins, a WebSocket upgrades, the app boots with its real config.

Done when every behavior has exactly one home, and each Wiring Test states in one line why it must be e2e.

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

Spend Unit Tests where bugs hide: branching rules, parsing and validation, permission and security decisions, state transitions, boundaries, and data transforms. Skip glue with no decisions in it (getters, pass-throughs, framework config); a Wiring Test or the type checker already covers it.

Cover each rule's branches, one test per meaningful case, named after the rule. A good Unit Test fails when its rule is broken: before finishing, break the rule once (make the check return `true`, skip the compare) and confirm the test goes red.

## 5. Keep Wiring Tests few and on the happy path

A Wiring Test walks the main path a real user takes and asserts it arrives. Add a failure-mode Wiring Test only when that failure is the point of the app and only the real stack can enforce it: an auth gate that must block a request at the proxy, a security header the browser must honor. Keep these to a handful.

A Wiring Test may assert exact responses on its path, but leaves rule variants (every error code, every bad input) to Unit Tests.

## 6. Move tests down, never drop them

When an e2e test checks logic, move it: add the Unit Test and remove the e2e test in the same change, and list old test → new test in the PR description.
