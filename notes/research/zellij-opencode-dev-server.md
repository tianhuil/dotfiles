# Zellij + OpenCode: Running Dev Server in Separate Panes

**Created**: 2026-04-09
**Sources**: [Zellij Docs](https://zellij.dev/documentation/layouts.html), [OpenCode CLI Docs](https://opencode.ai/docs/cli/), [Zellij CLI Control](https://zellij.dev/documentation/controlling-zellij-through-the-cli.html)

## Executive Summary

- Zellij `.kdl` layouts let you define multi-pane/tab workspaces with OpenCode in one pane and a dev server in another, launched with a single command.
- `zellij run` provides ad-hoc pane creation from within a session to start a dev server alongside an already-running OpenCode TUI.
- OpenCode's `serve` + `run --attach` pattern enables headless multi-pane scripting without TUI cold-boot overhead.

## Detailed Findings

### Approach 1: KDL Layout File (Recommended)

Define a persistent workspace layout. Place in `~/.config/zellij/layouts/opencode.kdl` or reference by path.

```kdl
layout {
    cwd "/path/to/project"

    tab name="code" {
        pane split_direction="vertical" {
            pane size="70%" {
                command "opencode"
            }
            pane size="30%" {
                command "bun" {
                    args "run" "dev"
                }
                close_on_exit true
            }
        }
    }
}
```

Launch: `zellij --layout opencode`

**Key KDL properties:**

| Property          | Values                     | Default      | Notes                                                                                                        |
| ----------------- | -------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| `command`         | string (path or PATH name) | shell        | Executable to run in pane                                                                                    |
| `args`            | "arg1" "arg2" ...          | —            | Must be inside child braces                                                                                  |
| `cwd`             | "/abs/path" or "rel/path"  | launch cwd   | Relative paths compose: pane > tab > global > launch                                                         |
| `split_direction` | "vertical" / "horizontal"  | "horizontal" | Direction of children                                                                                        |
| `size`            | "50%" or 1 (fixed)         | auto         | Fixed values unstable for non-plugin panes ([zellij#1758](https://github.com/zellij-org/zellij/issues/1758)) |
| `close_on_exit`   | true / false               | false        | Auto-close pane on command exit                                                                              |
| `start_suspended` | true / false               | false        | Show "press ENTER to run" prompt                                                                             |
| `focus`           | true / false               | false        | First `focus=true` pane wins                                                                                 |
| `name`            | string                     | auto         | Pane/tab title                                                                                               |
| `borderless`      | true / false               | false        | Hide pane frame                                                                                              |
| `stacked`         | true / false               | false        | Stack children panes (only one expanded)                                                                     |

**Multi-tab example:**

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
        pane command="bun" {
            args "run" "dev"
            close_on_exit true
        }
    }

    tab name="git" {
        pane command="lazygit"
    }
}
```

### Approach 2: `zellij run` (Ad-Hoc from Inside Session)

Open a new pane with a command while OpenCode is already running. Useful for quick tasks.

```bash
zellij run -- bun run dev
zellij run --direction right -- bun run dev
zellij run --floating -- bun run dev
zellij run --close-on-exit -- bun run dev
zellij run --start-suspended -- bun run dev
zellij run --cwd /other/project -- bun run dev
zellij run --name "dev-server" -- bun run dev
```

Shell completions add shortcuts (after `zellij setup --generate-completion zsh`):

```bash
zr bun run dev          # new pane
zrf bun run dev         # new floating pane
ze ./src/index.ts       # open file in $EDITOR
```

**Blocking modes** (useful for scripting):

```bash
zellij run --block-until-exit -- bun test
zellij run --block-until-exit-success -- bun run build
zellij run --blocking -- bun run lint
```

### Approach 3: OpenCode `serve` + `run --attach` (Headless/Scripting)

Avoid TUI cold-boot by running a persistent headless server, then attaching multiple `run` commands to it.

```bash
# Pane 1: headless server
opencode serve --port 4096

# Pane 2 (or from script): attach TUI
opencode attach http://localhost:4096

# Any terminal: non-interactive run (no cold boot)
opencode run --attach http://localhost:4096 "explain the auth flow"
opencode run --attach http://localhost:4096 --command "run tests"
```

**Combined with Zellij layout:**

```kdl
layout {
    tab name="opencode-dev" {
        pane split_direction="vertical" {
            pane size="65%" command="opencode"
            pane size="35%" {
                command "bun"
                args "run" "dev"
                close_on_exit true
            }
        }
    }
    tab name="headless" {
        pane command="opencode" {
            args "serve" "--port" "4096"
            close_on_exit true
        }
    }
}
```

### Approach 4: CLI Actions (Runtime Pane/Tab Control)

Control Zellij programmatically from scripts or keybindings:

```bash
zellij action new-pane
zellij action new-tab
zellij action go-to-next-tab
zellij action go-to-previous-tab
zellij action move-focus left
zellij action resize increase left

# Override layout on active tab (dynamic reorganization)
zellij action override-layout /path/to/new-layout.kdl
zellij action override-layout /path/to/layout.kdl \
  --retain-existing-terminal-panes \
  --apply-only-to-active-tab
```

Target a specific session:

```bash
zellij --session my-session action new-pane
```

## Tradeoffs

| Approach           | Pros                                         | Cons                             |
| ------------------ | -------------------------------------------- | -------------------------------- |
| KDL Layout         | Reproducible, single command, team-shareable | Static; must edit file to change |
| `zellij run`       | Flexible, ad-hoc, no config needed           | Manual each time                 |
| `serve` + `attach` | No cold boot, scriptable, multi-client       | Extra setup, HTTP surface        |
| CLI Actions        | Full programmatic control                    | More complex, requires scripting |

## OpenCode CLI Reference

Relevant commands for multi-pane workflows:

- `opencode` — launch TUI (default)
- `opencode serve` — headless HTTP server
- `opencode attach <url>` — TUI frontend for remote server
- `opencode run "prompt"` — non-interactive single prompt
- `opencode run --attach <url> "prompt"` — skip MCP cold boot
- `opencode run --command "command"` — run as a command (for scripting)
- `opencode -c` / `--continue` — resume last session
- `opencode -s <id>` / `--session` — resume specific session

## References

- [Zellij Layouts](https://zellij.dev/documentation/layouts.html) — accessed 2026-04-09
- [Zellij Creating a Layout](https://zellij.dev/documentation/creating-a-layout.html) — accessed 2026-04-09
- [Zellij Run & Edit](https://zellij.dev/documentation/zellij-run-and-edit.html) — accessed 2026-04-09
- [Zellij CLI Control](https://zellij.dev/documentation/controlling-zellij-through-the-cli.html) — accessed 2026-04-09
- [OpenCode CLI](https://opencode.ai/docs/cli/) — accessed 2026-04-09
- [OpenCode Intro](https://opencode.ai/docs/) — accessed 2026-04-09
