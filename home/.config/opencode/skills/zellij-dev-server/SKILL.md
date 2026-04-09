---
name: zellij-dev-server
description: Run dev servers (or any long-running processes) alongside OpenCode in Zellij with separate panes/tabs
---

This skill teaches you how to run development servers (or any long-running processes) in Zellij while using OpenCode, so you can monitor the server output in a separate pane or tab.

## Quick Commands

### From Inside a Zellij Session

Open a new pane with a dev server:

```bash
zellij run -- bun run dev
zellij run --direction right -- bun run dev
zellij run --floating -- bun run dev
```

Open a new tab with a dev server:

```bash
zellij action new-tab -n "dev-server" && zellij run -t "dev-server" -- bun run dev
```

### Block Until Exit (for scripts)

```bash
zellij run --block-until-exit -- bun test
zellij run --block-until-exit-success -- bun run build
```

### Kill the Server Pane

```bash
zellij action close-pane
# or Ctrl+d in the pane, or Ctrl+Shift+p then choose "Close Pane"
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
| `zellij run` | Quick, one-off dev server; already in a Zellij session |
| Layout file | Repeated workflow; want reproducible multi-pane setup |
| `zellij run --floating` | Temporary server you want visible on top |
| `zellij run --block-until-exit` | Server needed for next command (e.g., run tests after dev server starts) |

## Common Patterns

### Run Next.js dev server
```bash
zellij run -- npm run dev
```

### Run Bun dev server
```bash
zellij run -- bun run dev
```

### Run Python server
```bash
zellij run -- python manage.py runserver
```

### Run Docker Compose
```bash
zellij run -- docker compose up
```

### Run with specific port
```bash
zellij run -- bun run dev --port 3001
```

## Zellij Navigation

- `Ctrl+Tab` — Next tab
- `Ctrl+Shift+Tab` — Previous tab
- `Ctrl+Shift+p` — Pane menu (close, rename, etc.)
- `Ctrl+o` then `h/j/k/l` — Move focus between panes