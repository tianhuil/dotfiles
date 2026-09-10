---
name: ts-coding-setup
description: One-time TypeScript repo setup — bun or pnpm, Biome lint/format, strict tsconfig, test runner, package.json scripts, and daily validation commands. Use when creating or bootstrapping a TS/JS repo, or when a repo lacks typecheck/lint/format tooling.
metadata:
  audience: developers
  workflow: setup
---

# TypeScript Repo Setup

One-time setup for a TypeScript repo: package manager, Biome, strict tsconfig, tests.
Coding style itself lives in the `ts-coding-standards` skill.

## Package Manager: bun or pnpm

Pick one per repo; never use `npm` or `yarn`.

- **bun** (default): fastest; built-in test runner and bundler.
- **pnpm**: prefer for existing pnpm repos, large workspaces, or when Node compat matters.

| Task | bun | pnpm |
|---|---|---|
| init | `bun init -y` | `pnpm init` |
| add dep | `bun add zod` | `pnpm add zod` |
| add dev dep | `bun add -d typescript @biomejs/biome` | `pnpm add -D typescript @biomejs/biome` |
| run script | `bun run dev` | `pnpm dev` |
| exec bin | `bunx biome init` | `pnpm dlx biome init` or `pnpm exec biome init` |

## Tooling: Biome (lint + format in one)

Single tool replacing ESLint + Prettier:

```bash
bunx @biomejs/biome init   # creates biome.json (or: pnpm dlx @biomejs/biome init)
```

`biome.json` (tune to taste):

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": { "formatter": { "quoteStyle": "double" } }
}
```

If migrating an ESLint/Prettier repo: remove their configs and deps; Biome can import
settings with `biome migrate eslint-prettier --write`.

## tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "skipLibCheck": true
  }
}
```

Key settings:

- `noUncheckedIndexedAccess` — `arr[0]` is `T | undefined`, forces safe access
- `noImplicitOverride` — requires `override` keyword in subclasses
- `verbatimModuleSyntax` — enforces `import type` for type-only imports
- `noFallthroughCasesInSwitch` — prevents accidental switch fallthrough

## package.json scripts

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "test": "bun test"
  }
}
```

- With pnpm, use `vitest` instead of `bun test`: add `vitest` and set `"test": "vitest"`.
- Add `@types/node` if the code touches Node APIs.

## Git

`.gitignore`: `node_modules/`, build output (`dist/`, `.tsbuildinfo`). Commit the lockfile
(`bun.lock` / `pnpm-lock.yaml`).

## Daily loop after setup

```bash
# After each non-trivial change
bun run typecheck && bun run check:fix

# Targeted tests only — never the whole suite while iterating
bun test src/utils/user.test.ts

# Review your diff against ts-coding-standards before finishing
git diff
```

If errors appear in files another agent is editing, fix only files you touched.
