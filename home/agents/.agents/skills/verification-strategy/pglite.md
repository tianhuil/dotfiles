# PGlite for Unit Tests

When a Unit Test needs Postgres, use [PGlite](https://pglite.dev/docs/) (`@electric-sql/pglite`): [real Postgres compiled to WASM](https://pglite.dev/docs/about), running in-process with `new PGlite()`. Prefer it over [pg-mem](https://github.com/oguimbal/pg-mem), which is a partial emulator: its own SQL parser, no timezones, JS numbers for every numeric type, no extensions. PGlite runs the same SQL as production; pg-mem can pass a test that Postgres would fail.

- **One instance per test file** (`beforeAll`), migrations applied once, tables emptied before each test. Cold start takes seconds, so share the instance across the file's tests.
- **Use the app's real migrations and data layer**, for example Drizzle via [`drizzle-orm/pglite`](https://orm.drizzle.team/docs/connect-pglite) with the app's `Db` type passed in as a dependency.
- **Stay on the query builder** rather than raw `execute`, whose result shapes differ between PGlite and node-postgres.
- **Match the major Postgres version** between PGlite and the production image.
- **Move rows, not clocks**: Postgres `now()` ignores fake timers, so put timestamps in the past instead.
