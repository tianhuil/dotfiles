# OpenCode Worktree (ocwt)

An opencode plugin that manages git worktrees and auto-commits after each agent turn.

## Research Findings

### Plugin vs Application

**Recommendation: Use an opencode plugin.** The opencode plugin system (`@opencode-ai/plugin`) provides:

1. **Hooks for events**: The `event` hook receives all opencode events including `session.idle` which fires when the agent finishes processing and awaits user input. (see `opencode-events-research.md`).
2. **Shell access**: Plugins receive a `$` BunShell instance for running git commands.
3. **Worktree context**: Plugins receive `directory` and `worktree` paths automatically.

### Key Plugin Features for ocwt

- **`event` hook**: Receives events, including `session.idle` (type: `"session.idle"`) - this is when we auto-commit.
- **`chat.message` hook**: Called when a new message is received, provides message details including diffs.
- **BunShell `$`**: Can run git commands like `git worktree add`, `git commit`, etc.

### Plugin Limitation

The plugin system **does not support CLI arguments**. Plugins are configured via `opencode.json` and loaded automatically. We cannot pass `--worktree feature/branch` to opencode.

**Solution**: Build a **wrapper application** (`ocwt`) that:

1. Creates the worktree before launching opencode
2. Sets an environment variable or writes a config file with the worktree info
3. Launches opencode with a plugin that reads this config

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ocwt CLI app                              │
│  1. Parse args (branch name, opencode commands)                 │
│  2. Read .ocwt.yml config                                        │
│  3. Create worktree via git worktree add                         │
│  4. Run post_create hooks (copy .env, symlink dirs, etc.)        │
│  5. Write .ocwt-session.json with worktree metadata              │
│  6. Launch opencode with --plugin pointing to ocwt-plugin.ts     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ocwt-plugin.ts (opencode plugin)              │
│  1. Read .ocwt-session.json                                      │
│  2. Hook: session.idle → git commit -am "<summary>"              │
│  3. Hook: session.diff → extract summary for commit message      │
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
  .description("OpenCode Worktree - manage git worktrees with auto-commit")
  .argument("<branch>", "Branch name for the worktree")
  .argument("[opencode-args...]", "Arguments to pass to opencode")
  .option("-b, --new-branch", "Create a new branch")
  .option("--base <commit>", "Base commit/branch for new worktree")
  .action(async (branch, opencodeArgs, options) => {
    // 1. Load .ocwt.yml config
    // 2. Resolve worktree path
    // 3. Create worktree: git worktree add <path> <branch>
    // 4. Run post_create hooks
    // 5. Write session metadata
    // 6. Spawn opencode with plugin
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

### Phase 4: OpenCode Plugin (`src/plugin.ts`)

```typescript
import type { Hooks, Plugin } from "@opencode-ai/plugin";

export const OcwtPlugin: Plugin = async (ctx) => {
  // Read session metadata
  const sessionMeta = await readSessionMeta(ctx.directory);

  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        // Auto-commit changes
        await autoCommit(ctx.$, ctx.directory);
      }
    },
  } satisfies Hooks;
};

async function autoCommit($: BunShell, directory: string): Promise<void> {
  // 1. Check for staged/unstaged changes
  const status = await $`git status --porcelain`.cwd(directory).quiet().text();

  if (!status.trim()) return; // No changes

  // 2. Generate commit message from git diff --stat
  const diffStat = await $`git diff --stat`.cwd(directory).quiet().text();

  // 3. Commit all changes
  const message = generateCommitMessage(diffStat);
  await $`git commit -am ${message}`.cwd(directory);
}
```

### Phase 5: Main Entry (`src/index.ts`)

```typescript
#!/usr/bin/env bun
export { OcwtPlugin } from "./plugin";
```

## Package Structure

```
ocwt/
├── src/
│   ├── cli.ts          # CLI entry point (commander)
│   ├── worktree.ts     # Git worktree operations
│   ├── hooks.ts        # Hook execution (copy, symlink, command)
│   ├── plugin.ts       # OpenCode plugin for auto-commit
│   ├── config.ts       # .ocwt.yml parsing
│   └── index.ts        # Plugin export
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

```json
{
  "dependencies": {
    "commander": "^14.0.0",
    "yaml": "^2.7.0",
    "@opencode-ai/plugin": "^1.1.65"
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

# Remove worktree after done
> ocwt remove feature/auth
```

## Tasks

- [ ] Implement CLI with commander (`src/cli.ts`)
- [ ] Implement worktree operations (`src/worktree.ts`)
- [ ] Implement hooks system (`src/hooks.ts`)
- [ ] Implement config parsing (`src/config.ts`)
- [ ] Implement auto-commit plugin (`src/plugin.ts`)
- [ ] Add tests
- [ ] Add shell completion (bash, zsh, fish)

## Notes

- Use `bun` for all package management and running scripts
- Use `Bun.$` template literals for shell commands (available via plugin context)
- Plugin will be loaded via `opencode.json` config:
  ```json
  {
    "plugin": ["ocwt"]
  }
  ```
- The wrapper app sets up the worktree, then opencode + plugin handles the rest
