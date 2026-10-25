---
name: env-validation-and-status
description: Typed, Zod-validated environment-variable access through a single gatekeeper module with lazy getters, separate client/server env tiers for bundler frameworks like Next.js, censored env status reporting, and public health-check status pages. Use when creating or reviewing env/config modules, .env validation, or /status service health-check endpoints in TypeScript apps.
license: MIT
metadata:
  audience: users
  workflow: general
---

# Env validation and status pages

Five rules:

1. **One gatekeeper module.** App code never reads `process.env` directly. Every read goes through one class whose getters are the only env access points.
2. **Validate on access, name the variable.** Each getter parses with Zod, so a missing or malformed variable fails at the point of use with the variable name in the error — not deep inside a client SDK.
3. **Validate format, not just presence.** URLs, UUIDs, emails, enums, integer ranges, cross-field constraints. Default only when a safe default exists; never default secrets or auth-critical values.
4. **Report pass/fail, never values.** Status output says whether a variable is missing or malformed. It never echoes the value or Zod internals.
5. **Health checks exercise the real dependency** through its normal code path, concurrently, each returning `ok`/`error` plus a user-safe message — rendered by a public, never-cached, secret-free server page.

## The env module

```ts
// lib/config/env.ts
import { z } from 'zod';

/**
 * Typed, validated environment variables. Each getter validates on access.
 * All application env reads go through this object — never `process.env`.
 */
class ServerEnv {
  get NODE_ENV(): string {
    return z
      .enum(['development', 'production', 'test'])
      .default('development')
      .parse(process.env.NODE_ENV);
  }

  // Format-validated, no default: a typo here must fail loudly.
  get DATABASE_URL(): string {
    return z.url({ error: 'DATABASE_URL' }).parse(process.env.DATABASE_URL);
  }

  // Secrets: presence + length only. Never logged, never exported.
  get API_SECRET(): string {
    return z.string({ error: 'API_SECRET' }).min(32).parse(process.env.API_SECRET);
  }

  // Numbers arrive as strings; coerce and bound them.
  get PORT(): number {
    return z.coerce
      .number({ error: 'PORT' })
      .int()
      .min(1)
      .max(65535)
      .default(3000)
      .parse(process.env.PORT);
  }

  // Booleans: never z.coerce.boolean() — it accepts any non-empty string as true.
  get READ_ONLY(): boolean {
    return z
      .enum(['true', 'false'])
      .default('false')
      .parse(process.env.READ_ONLY) === 'true';
  }

  // Collections: split, normalize, dedupe, and validate each element.
  get CORS_ALLOW_ORIGINS(): string[] {
    const origins = z
      .string({ error: 'CORS_ALLOW_ORIGINS' })
      .parse(process.env.CORS_ALLOW_ORIGINS)
      .split(';')
      .map((o) => o.trim().toLowerCase());
    return z
      .url()
      .array()
      .min(1)
      .transform((values) => [...new Set(values)])
      .parse(origins);
  }

  // Cross-field constraint: validated when either getter is read.
  get SESSION_HARD_TTL_MS(): number {
    return z.coerce
      .number({ error: 'SESSION_HARD_TTL_MS' })
      .int()
      .positive()
      .refine((value) => value > this.SESSION_SOFT_TTL_MS, {
        message: 'SESSION_HARD_TTL_MS must exceed SESSION_SOFT_TTL_MS',
      })
      .default(2 * 60 * 60 * 1000)
      .parse(process.env.SESSION_HARD_TTL_MS);
  }

  get SESSION_SOFT_TTL_MS(): number {
    return z.coerce
      .number({ error: 'SESSION_SOFT_TTL_MS' })
      .int()
      .positive()
      .default(60 * 60 * 1000)
      .parse(process.env.SESSION_SOFT_TTL_MS);
  }
}

export const env = new ServerEnv();
```

Optionally fail fast in production by calling `getValidationFailures()` (below) at boot and exiting non-zero; keep validation lazy in development so a missing optional var doesn't block unrelated work.

## Client/server tiers (Next.js and other bundler frameworks)

Bundlers inline only explicitly public vars into client bundles, so there are two tiers, not one:

```ts
// lib/config/client-env.ts — the ONLY env module client code may import
import { z } from 'zod';

export class ClientEnv {
  get NEXT_PUBLIC_APP_VERSION(): string {
    return z
      .string({ error: 'NEXT_PUBLIC_APP_VERSION' })
      .parse(process.env.NEXT_PUBLIC_APP_VERSION);
  }
}

export const clientEnv = new ClientEnv();
```

```ts
// lib/config/env.ts — server tier; extends the client tier so server code
// sees everything through one object.
import 'server-only'; // any client import of this file becomes a build error
import { z } from 'zod';
import { ClientEnv } from './client-env';

class ServerEnv extends ClientEnv {
  get DATABASE_URL(): string {
    return z.url({ error: 'DATABASE_URL' }).parse(process.env.DATABASE_URL);
  }
  // ...
}

export const env = new ServerEnv();
```

Rules for the tiers:

- Client tier contains only vars the bundler inlines (`NEXT_PUBLIC_*`, `VITE_*`). Never secrets.
- Server tier extends the client tier. Never the reverse.
- `import 'server-only'` (or the framework equivalent) in the server module so an accidental client import fails the build instead of leaking server env.

## Censored status reporting

Add to the env class a scan that invokes every getter and reports failures without values. The prototype walk auto-discovers new getters, so the scan can't go stale:

```ts
  /**
   * Invokes every getter and catches validation errors. Messages are censored:
   * absent vs malformed only — never the raw value or the Zod message.
   */
  getValidationFailures(): string[] {
    const names = new Set<string>();
    let proto = Object.getPrototypeOf(this) as object | null;
    while (proto !== null && proto !== Object.prototype) {
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(proto))) {
        if (typeof descriptor.get === 'function') names.add(key);
      }
      proto = Object.getPrototypeOf(proto) as object | null;
    }

    return [...names].flatMap((name) => {
      try {
        Reflect.get(this, name);
        return [];
      } catch {
        const isAbsent = Reflect.get(process.env, name) === undefined;
        return [
          isAbsent
            ? `Required env variable ${name} was not passed`
            : `Env variable ${name} is in an unexpected format`,
        ];
      }
    });
  }
```

Getters must stay validation-only (no network calls, no logging) so this scan is safe to run.

## Status page

One public server-rendered page runs all checks. Each check exercises the real dependency the way production code uses it — not just "is it configured":

- **DB connection live**: run a trivial query (`SELECT 1`) through the same pool the app uses.
- **Schema/migrations applied**: verify expected tables exist, derived from the schema definition so the list stays in sync automatically.
- **External services reachable**: make the cheapest authenticated call the provider offers (verify, quota, ping) — this proves credentials and network, not just configuration.
- **Bundled/reference data loads**: load and validate the files or fixtures the app depends on at runtime.
- **Env vars valid**: the censored scan from above.

```ts
// server/checks.ts
/** User-safe result — must never contain secrets, credentials, or PII. */
export type CheckResult = { status: 'ok' | 'error'; message: string };

export async function runCheck(
  name: string,
  logger: { error: (e: unknown, msg: string) => void },
  probe: () => Promise<string>
): Promise<CheckResult> {
  try {
    return { status: 'ok', message: await probe() };
  } catch (e) {
    logger.error(e, `status check failed: ${name}`); // full detail server-side only
    return { status: 'error', message: `${name} is unreachable.` }; // censored client-side
  }
}
```

```tsx
// app/status/page.tsx
import { env } from '@/lib/config/env';
import { runCheck, type CheckResult } from '@/server/checks';

// Checks hit live dependencies on every request — never cache this page.
export const dynamic = 'force-dynamic';

function checkEnvVars(): CheckResult & { failures: string[] } {
  const failures = env.getValidationFailures();
  return {
    status: failures.length === 0 ? 'ok' : 'error',
    message:
      failures.length === 0
        ? 'All environment variables are valid.'
        : `${failures.length} environment variable(s) failed validation.`,
    failures,
  };
}

export default async function StatusPage() {
  const [dbConnection, dbSchema, email] = await Promise.all([
    runCheck('database', logger, async () => {
      await pool.query('SELECT 1');
      return 'Connection established.';
    }),
    runCheck('database schema', logger, async () => {
      const result = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1)`,
        [expectedTables]
      );
      const found = result.rowCount ?? 0;
      if (found < expectedTables.length) {
        throw new Error(
          `Only ${found} of ${expectedTables.length} expected tables found`
        );
      }
      return `All ${expectedTables.length} expected tables are present.`;
    }),
    runCheck('email provider', logger, async () => {
      if (!env.EMAIL_FROM) {
        return 'Development mode — email is logged, not sent.'; // intended dev substitute: still ok
      }
      await emailClient.verify();
      return 'Email provider is reachable.';
    }),
  ]);
  const envVars = checkEnvVars();
  const allOk =
    dbConnection.status === 'ok' &&
    dbSchema.status === 'ok' &&
    email.status === 'ok' &&
    envVars.status === 'ok';

  return (
    <main>
      <h1>System status</h1>
      <p>{allOk ? 'All systems are operational.' : 'One or more services require attention.'}</p>
      <ul>
        {[dbConnection, dbSchema, email, envVars].map((check) => (
          <li key={check.message}>
            {check.status === 'ok' ? '✅' : '❌'} {check.message}
          </li>
        ))}
      </ul>
      <p>
        This page is publicly accessible. It reports service health only — no
        credentials or sensitive configuration are exposed.
      </p>
    </main>
  );
}
```

Rules for the page:

- Server component (`page.tsx`), not a JSON route handler and not a client fetch. All checks run on the server during render; the censored messages are the only thing sent to the browser.
- `export const dynamic = 'force-dynamic'` so the page is never served from cache with stale health.
- A check that throws crashes the page render — that itself is the "server is down" signal, so no separate unreachable state is needed.
- Per check, render the censored server message plus a static list of likely causes, written as hypotheses (e.g. "the migration job may not have run") — never derived from the caught error or server internals.
- A development substitute (e.g., "email logged to console") counts as ok only when that is the intended configuration for the current env — encode the condition explicitly, don't assume.
- Re-running checks is a page reload; add a refresh button only if you adopt client components later.

## Tests

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from './env';

afterEach(() => vi.unstubAllEnvs());

describe('env validation', () => {
  it('names the missing variable', () => {
    vi.stubEnv('DATABASE_URL', undefined);
    expect(() => env.DATABASE_URL).toThrow(/DATABASE_URL/);
  });

  it('rejects malformed values', () => {
    vi.stubEnv('DATABASE_URL', 'not a url');
    expect(() => env.DATABASE_URL).toThrow(/DATABASE_URL/);
  });

  it('never echoes values in status output', () => {
    vi.stubEnv('API_SECRET', 'sup3r-s3cret-value');
    vi.stubEnv('DATABASE_URL', 'not a url');
    const failures = env.getValidationFailures();
    expect(failures).toContain('Env variable DATABASE_URL is in an unexpected format');
    expect(failures.join(' ')).not.toContain('sup3r-s3cret-value');
  });
});
```

Also add a test per non-trivial getter: defaults applied, collections normalized and deduped, cross-field constraints enforced.
