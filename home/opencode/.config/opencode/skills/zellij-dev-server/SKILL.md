---
name: zellij-dev-server
description: Run dev servers (or any long-running processes) alongside OpenCode in Zellij with separate panes/tabs
---

This skill teaches you how to run development servers (or any long-running processes) in Zellij while using OpenCode, so you can monitor the server output in a separate pane or tab.

## Key Concept: Pane IDs and Cross-Tab Operation

All `zellij` commands below use `--pane-id "$ZELLIJ_PANE_ID"` to target the AI's pane specifically. This ensures commands work correctly even when the user is viewing a different tab. `$ZELLIJ_PANE_ID` is automatically set by Zellij for every pane.

## Proactive Behavior

If the user wants to run a dev server (or any long-running process like `npm run dev`, `bun run dev`, `cargo run`, etc.), **proactively** run it in a Zellij pane instead of the current shell.

### Step 1: Check if a dev server is already running

Before launching a new pane, check if a dev server is already running:

```bash
ps aux | grep -E '(vite|next dev|bun run dev|webpack|node.*--watch|cargo run|turbo dev|npm run dev)' | grep -v grep
```

If a dev server is already running, **do not** launch a new one. Inform the user that a dev server appears to already be running and offer to restart it if needed.

### Step 2: Launch in a new pane on the AI's tab

If no dev server is running, launch it as a new pane next to the AI's current pane. This works correctly even if the user is viewing a different tab:

```bash
zellij run --pane-id "$ZELLIJ_PANE_ID" --direction right -- bun run dev
```

Substitute the appropriate command based on the project's package manager and scripts.

## Quick Commands

### Open a new pane with a dev server

```bash
zellij run --pane-id "$ZELLIJ_PANE_ID" --direction right -- bun run dev
zellij run --pane-id "$ZELLIJ_PANE_ID" --direction down -- bun run dev
zellij run --pane-id "$ZELLIJ_PANE_ID" --floating -- bun run dev
```

### Open a new tab with a dev server

```bash
zellij action new-tab -n "dev-server" && zellij run -t "dev-server" --pane-id "$ZELLIJ_PANE_ID" -- bun run dev
```

### Block Until Exit (for scripts)

```bash
zellij run --pane-id "$ZELLIJ_PANE_ID" --block-until-exit -- bun test
zellij run --pane-id "$ZELLIJ_PANE_ID" --block-until-exit-success -- bun run build
```

### Kill the Server Pane

```bash
zellij action close-pane --pane-id "$ZELLIJ_PANE_ID"
```

## Using Layouts (Recommended for Repeatable Workflows)

Create a layout file in `~/.config/zellij/layouts/dev.kdl`:

```kdl
layout {
    cwd "/path/to/project"

    tab name="code" focus=true {
        pane split_direction="vertical" {
            pane size="70%" command="opencode"
            pane size="30%" {
                command "bun"
                args "run" "dev"
                close_on_exit true
            }
        }
    }

    tab name="server" {
        pane {
            command "bun"
            args "run" "dev"
            close_on_exit true
        }
    }
}
```

Launch with: `zellij --layout dev`

## When to Use Each Approach

| Approach | Use When |
|----------|-----------|
| `zellij run --pane-id` | Quick, one-off dev server; AI or user on different tab |
| Layout file | Repeated workflow; want reproducible multi-pane setup |
| `zellij run --floating` | Temporary server you want visible on top |
| `zellij run --block-until-exit` | Server needed for next command (e.g., run tests after dev server starts) |

## Common Patterns

### Run Next.js dev server
```bash
zellij run --pane-id "$ZELLIJ_PANE_ID" --direction right -- npm run dev
```

### Run Bun dev server
```bash
zellij run --pane-id "$ZELLIJ_PANE_ID" --direction right -- bun run dev
```

### Run Python server
```bash
zellij run --pane-id "$ZELLIJ_PANE_ID" --direction right -- python manage.py runserver
```

### Run Docker Compose
```bash
zellij run --pane-id "$ZELLIJ_PANE_ID" --direction right -- docker compose up
```

### Run with specific port
```bash
zellij run --pane-id "$ZELLIJ_PANE_ID" --direction right -- bun run dev --port 3001
```

## Zellij Navigation

- `Ctrl+Tab` — Next tab
- `Ctrl+Shift+Tab` — Previous tab
- `Ctrl+Shift+p` — Pane menu (close, rename, etc.)
- `Ctrl+o` then `h/j/k/l` — Move focus between panes
