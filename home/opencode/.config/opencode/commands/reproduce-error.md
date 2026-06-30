---
name: reproduce-error
description: Create a minimal bug reproduction repo in tmpfs with CI, tests, and README
---

# Reproduce Error

Given a description of a bug in a database, tool, or library, create a minimal,
self-contained reproduction repository in a tmpfs directory and push it to GitHub
as a public repo under your account.

Resolve your GitHub login once at the start and reuse it:

```bash
GH_USER=$(gh api user --jq .login)
```

## Steps

### 1. Gather the error description

Ask the user to describe the bug in detail. Key questions:

- What expression, query, or API call produces the wrong result?
- What is the expected (correct) behavior?
- What actually happens?
- What tool/library/version is involved?

### 2. Identify the dependency pattern

Determine how the repro needs to connect to its dependency:

| Pattern | When to use | Example |
|---------|-------------|---------|
| **Docker service** | The dependency has a public Docker image with a network port | `dolthub/dolt-sql-server`, `postgres`, `redis`, `mysql` |
| **Binary install** | The dependency is a CLI binary needed for setup/schema/config | `dolt`, `sqlite3` CLI, `kubectl`, `gh` |
| **npm package** | The bug is in a library consumed directly by the test | A specific version of `zod`, `react`, `express` |
| **API service** | The bug involves a remote API (needs mocking or credentials) | GitHub API, OpenAI API |

### 3. Create the repo in tmpfs

Create the repo in a tmpfs directory for speed (no disk writes):

```bash
REPO_ROOT=$(mktemp -d -t repro-XXXXXX)
cd "$REPO_ROOT"
git init
bun init -y
```

Add the minimum dependencies needed. For database bugs:

```bash
bun add mysql2
bun add -d @types/bun @types/node
```

For library bugs, add only the library and its types.

Use the tsconfig from prior repos:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true
  }
}
```

### 4. Write the test

All tests must pass. The bug is demonstrated by showing that the broken query
**throws** (or returns an unexpected value), wrapped in `expect().toThrow()`
with a comment explaining the correct behavior. This way CI stays green.

Create a single test file `<bug-name>.test.ts`:

- Connect to the subject using env-var-based config (with sensible defaults)
- Show **(A) a working call** — a similar invocation that produces the correct result
- Show **(B) the broken call** — the buggy invocation that throws or returns wrong,
  wrapped so the test still passes
- Use `bun:test` (`test`, `expect`, `describe`, `beforeAll`)

**General pattern**:

```ts
import { test, expect, describe, beforeAll } from "bun:test";

const HOST = process.env.HOST ?? "127.0.0.1";

let client: ClientType;

beforeAll(async () => {
  client = await createClient(HOST);
  // Create schema and seed data if applicable
});

test("(A) working — similar invocation that produces correct result", async () => {
  const result = await doSomething(client, workingInput);
  expect(result).toBe(expectedValue);
});

test("(B) broken — the buggy invocation", async () => {
  // BUG: <tool> should <correct behavior>, but instead <wrong behavior>.
  // Tracking: <link-to-issue>
  expect(() => doSomething(client, buggyInput)).toThrow();
});
```

**Key patterns**:

- **Comments explain the bug** — every (B) test has a `// BUG:` comment describing expected vs actual behavior and a tracking link
- **Explicit test names**: `"JSON_LENGTH('[]') throws — BUG: should return 0 per MySQL spec"`
- **All tests pass** — (B) uses `toThrow()` for errors, `toEqual()` wrapped in a try-catch, or `expect().toBe(expectedButWrong)` with a comment when the wrong value is deterministic
- Test idempotent setup (`ON DUPLICATE KEY UPDATE`, `IF NOT EXISTS`)
- Test a working variant so the delta is crystal clear

#### Test variations by bug type

| Bug type | How (B) passes | Comment |
|----------|---------------|---------|
| **Wrong return value** | `toThrow()` on the invocation | Explain the expected value |
| **Wrong query plan** | Assert the broken plan structure via snapshot | Explain the correct plan |
| **Crash** | `toThrow()` | Explain the expected non-throwing behavior |
| **Wrong results on data** | Seed data, query, assert the wrong-but-deterministic result | Mark as BUG |

### 5. Handle dependencies that need binaries

Some bugs require a binary installed on the system (e.g. `dolt`, `sqlite3`, `kubectl`, a language runtime). Include them in the repro in two ways:

#### Local setup script

Write a `scripts/setup.sh` that installs the binary for local use:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Example: install Dolt
if ! command -v dolt &>/dev/null; then
  echo "Installing dolt..."
  curl -fsSL https://github.com/dolthub/dolt/releases/latest/download/install.sh | sudo bash
fi

# Example: install sqlite3
if ! command -v sqlite3 &>/dev/null; then
  echo "Installing sqlite3..."
  sudo apt-get update && sudo apt-get install -y sqlite3
fi

echo "All dependencies installed"
```

Reference it in README: `bash scripts/setup.sh`

#### CI — GitHub Actions binary install

For CI, install the binary in a step before running tests:

```yaml
      - name: Install <tool>
        run: |
          # Use the tool's official install script
          curl -fsSL https://github.com/<org>/<repo>/releases/latest/download/install.sh | sudo bash
          # Or use apt for system packages
          sudo apt-get update && sudo apt-get install -y <package>
```

#### CI — Docker service for server binaries

When the dependency runs as a server, use a Docker service container:

```yaml
    services:
      my-service:
        image: <org>/<image>:<tag>
        ports:
          - 3306:3306
        env:
          SOME_ENV: "value"
```

Add a wait-for-ready step after service start:

```yaml
      - name: Wait for service to accept connections
        run: |
          for i in $(seq 1 30); do
            if timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/3306" 2>/dev/null; then
              echo "Service is ready"
              exit 0
            fi
            echo "Waiting... ($i/30)"
            sleep 2
          done
          echo "Service did not become ready in time"
          exit 1
```

#### CI — Composite pattern (binary + Docker)

Some bugs need both the CLI binary (for schema/version operations) plus a running server (for queries). Combine both:

```yaml
    services:
      dolt:
        image: dolthub/dolt-sql-server:latest
        ports:
          - 3306:3306
        env:
          DOLT_ROOT_HOST: "%"
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install CLI binary
        run: |
          curl -fsSL https://github.com/dolthub/dolt/releases/latest/download/install.sh | sudo bash
      - name: Verify CLI version
        run: dolt version
      - run: bun install
      - name: Wait for service
        run: |
          for i in $(seq 1 30); do
            if timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/3306" 2>/dev/null; then
              echo "Ready"
              exit 0
            fi
            sleep 2
          done
          exit 1
      - run: bun test
```

### 6. Write the README

Create `README.md` with this structure:

- **Bug title**: one-line summary
- **Problem**: what the bug is and why it matters
- **Expected vs Actual**: a table comparing correct vs buggy behavior
- **Running**: how to run the repro
- **Environment**: version, OS, any relevant context

Template:

```markdown
# `<Tool>` `<feature>` Bug Reproduction

> `<expression/call>` returns `<wrong>` instead of `<correct>`.
> **Notably, `<working-variant>` correctly returns `<correct>`** — the bug is specific to `<condition>`.

## Running

Requires `<prerequisites>`:

```bash
# Start the server (if applicable)
docker run -d -p <port>:<port> <image>

# Or install the binary
bash scripts/setup.sh

bun install
bun test
```

## Expected vs Actual

| Expression | Expected | Actual |
|-----------|----------|--------|
| `buggy` | `<correct>` | `<wrong>` (⚠️ bug) |
| `working variant` | `<correct>` | `<correct>` |
| `another variant` | `<correct>` | `<correct>` |

## Notes

- Additional context, workarounds, or related issues
```

### 7. Add `package.json` scripts

```json
{
  "scripts": {
    "test": "bun test"
  }
}
```

### 8. Create the GitHub repo and push

```bash
gh auth setup-git
gh repo create "$GH_USER/<repo-name>" --public --push --source "$REPO_ROOT"
```

### 9. Verify CI passes

Check the Actions tab on GitHub to confirm CI runs green. All tests — both the
working query and the bug-demostration query — must pass. Green CI means the
repro correctly locks in the bug's current behavior.

## Notes

- Keep the test file self-contained — one file, no helpers.
- The point is **minimal**: the smallest possible code that demonstrates the delta between expected and actual behavior.
- When the bug is fixed, update the `toThrow()` test to assert the correct behavior — the repro becomes a regression test.
- Use employment-related data (departments, employees, salaries tables) for SQL/database repros.
- For library bugs, pin the exact library version in `package.json` so the bug is reproducible across time.
- If the bug requires a specific version, use that version explicitly in CI (Docker tag, binary version flag, npm `"@scope/pkg": "1.2.3"`).
- For push bug reports to the project, include a link to the repro repo in the issue.

## Examples

- JSON_LENGTH bug (Docker service + binary): <https://github.com/tianhuil/dolt-json-length-bug>
- Predicate pushdown bug (Docker service): <https://github.com/tianhuil/dolt-pushdown-repro>
