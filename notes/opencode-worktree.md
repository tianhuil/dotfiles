# OpenCode Worktree (ocwt)

A wrapper script that manages git worktrees for opencode sessions.

## Overview

`ocwt` simplifies working with git worktrees in conjunction with opencode by:

1. Creating worktrees from existing or new branches
2. Running post-creation hooks (copy `.env`, symlink directories, run commands)
3. Launching opencode in the worktree directory

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ocwt CLI app                              │
│  1. Parse args (branch name, opencode commands)                 │
│  2. Read .ocwt.yml config                                        │
│  3. Create worktree via git worktree add                         │
│  4. Run post_create hooks (copy .env, symlink dirs, etc.)        │
│  5. Launch opencode in the worktree directory                    │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration (.ocwt.yml)

Follows the `.wtp.yml` convention from https://github.com/satococoa/wtp:

```yaml
version: "1.0"

defaults:
  # Base directory for worktrees (relative to project root)
  base_dir: "../worktrees"

hooks:
  post_create:
    # Copy gitignored files from main worktree to new worktree
    - type: copy
      from: ".env"
      to: ".env"

    # Share directories between main and new worktree
    - type: symlink
      from: ".bin"
      to: ".bin"

    # Execute commands in the new worktree
    - type: command
      command: "bun install"
      env:
        NODE_ENV: "development"
```

## Implementation Plan

### Phase 1: CLI Application (`src/cli.ts`)

```typescript
import { Command } from "commander";

const program = new Command();
program
  .name("ocwt")
  .description("OpenCode Worktree - manage git worktrees for opencode sessions")
  .argument("<branch>", "Branch name for the worktree")
  .argument("[opencode-args...]", "Arguments to pass to opencode")
  .option("-b, --new-branch", "Create a new branch")
  .option("--base <commit>", "Base commit/branch for new worktree")
  .action(async (branch, opencodeArgs, options) => {
    // 1. Load .ocwt.yml config
    // 2. Resolve worktree path
    // 3. Create worktree: git worktree add <path> <branch>
    // 4. Run post_create hooks
    // 5. Launch opencode in worktree directory
    // 6. Optionally remove worktree on exit
  });

program.parse();
```

### Phase 2: Worktree Management (`src/worktree.ts`)

```typescript
/** Create a new git worktree */
export async function createWorktree(options: {
  branch: string;
  path: string;
  base?: string;
  createBranch?: boolean;
}): Promise<void>;

/** Remove a git worktree */
export async function removeWorktree(path: string): Promise<void>;

/** List all worktrees */
export async function listWorktrees(): Promise<Worktree[]>;

/** Get the main worktree path */
export async function getMainWorktree(): Promise<string>;
```

### Phase 3: Hooks System (`src/hooks.ts`)

```typescript
export type Hook =
  | { type: "copy"; from: string; to?: string }
  | { type: "symlink"; from: string; to: string }
  | {
      type: "command";
      command: string;
      env?: Record<string, string>;
      work_dir?: string;
    };

/** Run post_create hooks in the new worktree */
export async function runHooks(
  hooks: Hook[],
  mainWorktree: string,
  newWorktree: string,
): Promise<void>;
```

### Phase 4: Config Parsing (`src/config.ts`)

```typescript
export interface OcwtConfig {
  version: string;
  defaults: {
    base_dir: string;
  };
  hooks: {
    post_create: Hook[];
  };
}

/** Load and parse .ocwt.yml config */
export async function loadConfig(path: string): Promise<OcwtConfig>;

/** Get default config values */
export function getDefaultConfig(): Partial<OcwtConfig>;
```

### Phase 5: Main Entry (`src/index.ts`)

```typescript
#!/usr/bin/env bun
import { cli } from "./cli";

// Run CLI
await cli();
```

## Package Structure

```
ocwt/
├── src/
│   ├── cli.ts          # CLI entry point (commander)
│   ├── worktree.ts     # Git worktree operations
│   ├── hooks.ts        # Hook execution (copy, symlink, command)
│   ├── config.ts       # .ocwt.yml parsing
│   └── index.ts        # Main entry
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

```json
{
  "dependencies": {
    "commander": "^14.0.0",
    "yaml": "^2.7.0"
  },
  "devDependencies": {
    "@types/bun": "^1.2.0",
    "typescript": "^5.8.0"
  }
}
```

## Usage

```bash
# Create worktree from existing branch and launch opencode
> ocwt feature/auth

# Create new branch and worktree
> ocwt -b feature/new-thing

# Create worktree with a specific base
> ocwt -b hotfix/urgent --base v1.2.0

# Pass additional opencode arguments
> ocwt feature/auth --model anthropic/claude-4

# Remove a worktree manually
> ocwt remove feature/auth

# List all worktrees
> ocwt list
```

## Hook Types

### Copy Hook

Copy files from the main worktree to the new worktree:

```yaml
- type: copy
  from: ".env"
  to: ".env"
```

### Symlink Hook

Create symbolic links to share directories between worktrees:

```yaml
- type: symlink
  from: ".bin"
  to: ".bin"
```

### Command Hook

Execute commands in the new worktree:

```yaml
- type: command
  command: "bun install"
  env:
    NODE_ENV: "development"
  work_dir: "."
```

## Tasks

- [ ] Implement CLI with commander (`src/cli.ts`)
- [ ] Implement worktree operations (`src/worktree.ts`)
- [ ] Implement hooks system (`src/hooks.ts`)
- [ ] Implement config parsing (`src/config.ts`)
- [ ] Add tests
- [ ] Add shell completion (bash, zsh, fish)
- [ ] Add `remove` subcommand
- [ ] Add `list` subcommand

## Notes

- Use `bun` for all package management and running scripts
- Worktree paths are resolved relative to the project root
- The wrapper app handles all setup before launching opencode
- No plugin needed - opencode runs directly in the worktree
