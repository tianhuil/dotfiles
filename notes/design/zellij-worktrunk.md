# Zellij + Worktrunk Workflow Design

**Research Date:** 2026-04-01

## Executive Summary

- **Zellij** - Terminal multiplexer with CLI control for creating panes/tabs programmatically (like tmux)
- **Worktrunk** (`wt`) - Git worktree manager with hooks for automation
- **Workflow:** `wt switch --create <branch>` spawns zellij tab with opencode

## Chosen Approach: Layout File (Option A)

Tab with opencode pane (left, 60%) + terminal pane (right). Uses a KDL layout template, dynamically populated by the hook.

### Layout Template

`~/.config/worktrunk/layouts/worktree.kdl.template`:

```kdl
layout {
    tab name="__BRANCH__" cwd="__WORKTREE_PATH__" {
        pane split_direction="vertical" {
            pane size="60%" command="opencode" close_on_exit=true
            pane
        }
    }
}
```

### Global Config

`~/.config/worktrunk/config.toml`:

```toml
[post-start]
opencode = """
LAYOUT=$(mktemp /tmp/wt-layout-{{ branch | sanitize }}.XXXXX.kdl) && \
sed -e 's|__BRANCH__|{{ branch | sanitize }}|g' -e 's|__WORKTREE_PATH__|{{ worktree_path }}|g' \
  ~/.config/worktrunk/layouts/worktree.kdl.template > "$LAYOUT" && \
zellij action new-tab --layout "$LAYOUT" && rm "$LAYOUT"
"""

[post-remove]
zellij = "zellij action go-to-tab-name '{{ branch | sanitize }}' && zellij action close-tab || true"

[commit.generation]
command = "opencode run -m zai-coding-plan/glm-4.7-flashx --variant fast"
```

### Optional: Dev Server Per Worktree

Add to project config (`.config/wt.toml`) if needed:

```toml
[post-start]
dev = "npm run dev --port {{ branch | hash_port }}"

[list]
url = "http://localhost:{{ branch | hash_port }}"

[post-remove]
dev = "lsof -ti :{{ branch | hash_port }} -sTCP:LISTEN | xargs kill 2>/dev/null || true"
```

## Usage

```bash
wt switch --create feature-auth
wt remove
```

## Commands Reference

| Command                                  | Description                                |
| ---------------------------------------- | ------------------------------------------ |
| `wt switch --create <branch>`            | Create worktree + zellij tab + opencode    |
| `wt remove`                              | Remove worktree + close tab                |
| `zellij action go-to-tab-name "<name>"`  | Jump to specific tab                       |
| `zellij action new-tab --name N --cwd D` | Create new tab with name N in directory D  |
| `zellij action new-tab --layout FILE`    | Create tab from KDL layout file            |
| `zellij action new-pane --direction D`   | Split current pane (D: right/left/up/down) |
| `zellij action new-pane --floating`      | Open floating pane with default shell      |
| `zellij action close-pane`               | Close focused pane                         |

## Key Zellij CLI Options

### `new-tab`

- `--name NAME` — tab name
- `--cwd DIR` — working directory (propagates to all panes via layout)
- `--layout FILE` — KDL layout file (can define multiple panes)
- `-- COMMAND` — run command in initial pane

### `new-pane`

- `--direction D` — right/left/up/down
- `--floating` — floating pane
- `--cwd DIR` — working directory
- `--name NAME` — pane title
- `-- COMMAND` — run command instead of default shell
- **No `--tab` option** — only operates within current tab context

### KDL Layout (for `new-tab --layout`)

- `tab name="X" cwd="/path"` — tab with cwd (inherited by panes)
- `pane command="opencode"` — pane running a command
- `pane split_direction="vertical" { ... }` — split container
- `pane size="60%"` — percentage-based sizing

## Template Variables

| Variable                    | Description                      |
| --------------------------- | -------------------------------- |
| `{{ branch }}`              | Branch name                      |
| `{{ branch \| sanitize }}`  | Branch name with `/` → `-`       |
| `{{ worktree_path }}`       | Worktree directory path          |
| `{{ branch \| hash_port }}` | Deterministic port (10000-19999) |

## References

- https://worktrunk.dev/hook/ - Hook configuration (accessed 2026-04-01)
- https://worktrunk.dev/tips-patterns/#dev-server-per-worktree - Dev server pattern (accessed 2026-04-01)
- https://zellij.dev/documentation/cli-actions.html - Zellij CLI actions (accessed 2026-04-01)
- https://zellij.dev/documentation/creating-a-layout.html - Zellij KDL layout format (accessed 2026-04-01)

---

## Research Log

### 2026-04-01: Terminal Pane Support

**Problem:** Config only opened opencode in a new tab. Needed a terminal pane alongside it.

**Key findings:**

- `new-pane` has no `--tab` flag — only operates on currently focused tab
- `new-tab --layout FILE` supports KDL layout files with multiple panes
- KDL `tab cwd` propagates to all child panes
- Worktrunk supports pipeline ordering for sequential hooks

**Decision:** Option A (layout file) — both panes created atomically, no timing issues.
