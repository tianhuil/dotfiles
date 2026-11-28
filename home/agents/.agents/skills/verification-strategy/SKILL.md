---
name: verification-strategy
description: "Verification waterfall: prove each behavior with the cheapest check that catches its bug, and attach PR evidence. Use when planning, reviewing or moving tests, writing PR evidence, or when a test needs Postgres."
---

# Verification Strategy

Verify each behavior with the cheapest check that proves it: fast feedback, and no more tests than needed.

Terms used below:

- **Unit Test**: a test that runs in-process, in seconds, with no Docker, no network and no running app. It may use fakes and an in-memory database.
- **Component Test**: a React Testing Library test that renders front-end components together in-process, with the server mocked or its router called in-process.
- **Wiring Test**: an e2e test through the real stack (browser, proxy, server, database). It proves the parts are connected, not that the logic is right. Each one is slow and costs CI minutes, so each must earn its place.

## 1. Decide the PR's evidence first

Before writing checks, decide what will show the PR does what it claims:

1. **CI**: passing tests are the first evidence.
2. **UI change**: a Storybook story for each variant, with a screenshot of each on the PR.
3. **CLI change**: run the happy path(s) and paste the command and output into the PR.

## 2. Place each behavior on the waterfall

For each behavior, take the first rung that can prove it:

1. **Types.** Narrow types and functional code catch first-order bugs with no test at all. A state the type system cannot express needs no test.
   - **Narrow types**: type each value as tightly as it really is. Use literal unions (`'draft' | 'sent'`) over `string`, discriminated unions over bags of optional fields, and branded IDs (`UserId`) over raw strings, so a mixed-up argument fails to compile.
   - **Parse at the boundary**: parse unknown input (requests, env, JSON) with a schema such as Zod, so everything inside is typed. Keep `as any`, `as unknown as T` and non-null `!` out.
   - **Exhaustive switches**: end a `switch` over a union with a `never` check. Adding a case then breaks the build until every switch handles it.
   - **`const` and array methods**: build values with `.map`, `.filter` and `.flatMap` instead of `let` and loops. Each step's type is checked, and there is no mutable state to get wrong.
2. **Unit Test.** Types prove shape, not decisions. Test logic whose result depends on runtime values:
   - **Nested `if`s and early returns**: each path through them is one case.
   - **Boolean logic** (`||`, `&&`, `!`): a wrong operator or a missed negation still type-checks.
   - **Boolean conditions in DB queries**: `where` clauses that combine `and`, `or` and `not`.
   - **Loops and `let`**: off-by-one errors, empty input, early `break`, and accumulator state.
   - **Rules with many cases**: parsing and validation, permission and security decisions, state transitions, boundaries, and data transforms.

   Cover each rule's branches, one test per meaningful case, named after the rule. Leave glue with no decisions in it (getters, pass-throughs, framework config) to the type checker or a Wiring Test. When a test needs Postgres, follow [PGlite for Unit Tests](./pglite.md). When logic is hard to reach, see "Refactor for testability" (section 3).
3. **Lint rule.** Ban a whole class of code that type-checks and is normally valid, but is wrong in this codebase.
   - **When**: the bug is a pattern that can appear anywhere, so one rule beats a test at every call site. Example: comparing Mongo ObjectIds with `===` is always false for two instances; require `.equals()`.
   - **How**: write a [Biome plugin](https://biomejs.dev/linter/plugins/) in TypeScript, with types from `@biomejs/runtime`; it can read the file's semantic model. The JS/TS plugin format is a developer preview. For a pure syntax pattern, use GritQL instead.
   - **Message**: the diagnostic names the fix ("compare ObjectIds with `.equals()`"), not just the ban.
4. **Component Test.** Front-end behavior that only shows up when components render together.
   - **What**: a form submit calls the right mutation; loading, error and empty states render; a user event changes what is shown.
   - **How**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) in Vitest with a simulated DOM (jsdom or happy-dom). Drive it with `@testing-library/user-event`, and await async UI with `findBy*`.
   - **Query like a user**: find elements with `getByRole` and `getByLabelText`, so the test survives markup refactors.
   - **Mock at the network boundary**: keep the real hooks and intercept requests with the `trpc-testing` skill (MSW or msw-trpc). This proves component behavior; proving the real server is a Wiring Test's job.
   - **msw-trpc or `localLink`**: use msw-trpc for UI reactions to given responses; use tRPC's `localLink` to run the real router in-process when the assertion depends on server behavior. See [msw-trpc vs localLink](./msw-trpc-vs-locallink.md) for the tradeoffs.
   - **Pull logic out**: extract formatting and derived state into pure functions and give them Unit Tests instead.
5. **Wiring Test.** Only for behavior that lives between processes, where no fake can stand in:
   - a route reaches its handler
   - a proxy forwards or blocks a request
   - a cookie survives a real browser across origins
   - a WebSocket upgrades
   - the app boots with its real config

   > **Keep Wiring Tests few and on the happy path.** A Wiring Test walks the main path a real user takes and asserts it arrives. Add a failure-mode Wiring Test only when that failure is the point of the app and only the real stack can enforce it: an auth gate that must block a request at the proxy, a security header the browser must honor. Keep these to a handful. A Wiring Test may assert exact responses on its path, but leaves rule variants (every error code, every bad input) to Unit Tests.

> **Prove each check can fail.** Before finishing, break the rule once (make the check return `true`, skip the compare) and confirm the check goes red. For a lint rule, confirm it flags a sample violation.

> **Test at the highest useful seam.** A seam is where a test enters the code and swaps in its dependencies. Within a rung, enter through the public entry point (a procedure, a component, a command) so the test checks behavior and survives refactors. When a decision is hard to reach from there, extract it and test it lower (section 3).

Done when every behavior has exactly one home (a rung and a seam), and each Wiring Test states in one line why no earlier rung can prove it.

**Move each check to its rung in one change.** Move a check up when it sits on a later rung than it needs (an e2e test that checks logic, a Unit Test a narrower type would make impossible). Move it down to a Wiring Test when it only passes because of its mock (section 4). Add the new check and remove the old one in the same change, and list old check → new check in the PR description.

## 3. Refactor for testability

When logic is hard to reach from a Unit Test, change the code's shape, never its behavior:

- **Extract pure functions** for decisions: `safeNext(next)`, `needsRefresh(token, now)`, `missingTokenAction(env)`.
- **Split each handler into a core and a wrapper**: `core(req, deps) -> Response` holds the logic; the framework route is a one-line wrapper that builds `deps`.
- **Inject dependencies** (`db`, auth client, `fetch`, `now`) as parameters with production defaults, so existing callers keep working.
- **Read config in one module**; tests vary it with stubs (for example `vi.stubEnv`) instead of mutating `process.env`.
- **Pass time in** as a value or as data (an `expires_at` already in the past), rather than faking clocks.

Land the refactor as its own change with test files untouched. The existing suite passing unchanged is the proof that behavior held.

## 4. Treat mocking as a test smell

- **Mock the input, not the subject.** A mock is fine as the test's input: a Component Test feeds a canned response and asserts what the UI does with it. It is a smell when the assertion is really about the mocked thing (server, database, browser, transport or configuration behavior), because the test then checks the mock. Run the real code instead: in-process where possible (PGlite, tRPC `localLink`), or in a Wiring Test. Keep mocks small; when one grows to preserve a test, replace it with the real dependency.
- **Fake only what you cannot run**: unavailable third-party services, nondeterministic inputs, and failure paths the real dependency cannot safely produce. Keep the faked contract small, and cover the integration with at least one real-stack path when feasible.
- **A fake rejects what the real tool rejects.** Build a fake CLI or API from recorded real output (the research note in section 5), not from what the code expects; a fake that accepts every call proves nothing. For each call that changes external state (create, update, repair), run it once against the real tool and read the state back, because a call can exit 0 while changing nothing (an ignored flag, a field outside the update mask).

## 5. Test our code, not its environment

- **Record third-party behavior in a research note.** Whether Docker, Cloud Run, `gcloud`, an external API or another service honors a flag, its defaults, or its error wording is not something a PR can change, so a per-PR check only re-proves a fact. Unit-test the arguments your code passes. Record the behavior once in a research note with the [`my-research`](../my-research/SKILL.md) skill, in `notes/research/`: the service, the API version, the documented behavior, request and response examples, authentication assumptions, failure semantics, source URLs and access dates. Update the note when the dependency or API version changes. The note is the evidence for the service's behavior; local tests are the evidence for our code.
- **Test Git integration through fixture repositories.** When code intentionally integrates with Git, test its observable behavior against controlled fixture repositories or an explicit Git boundary. Whether a file is committed, or a path shows in `git status`, is checkout state rather than application behavior, so it gets no test.
