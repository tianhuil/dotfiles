---
name: orca-spawn
description: >-
  Spawn a fresh independent Orca workspace (git worktree) containing a single
  running pi instance seeded with given instructions. Uses the Orca CLI to
  create the worktree + first terminal and launch pi, then delivers the prompt.
  Trigger when the user says "orca spawn", "spawn a pi in a new orca
  workspace/worktree", "launch/start pi in orca", "open a pi agent in a new
  worktree", "give pi its own workspace", or otherwise wants a brand-new Orca
  workspace whose sole occupant is a live pi given a task. This creates an
  *independent* workspace (not stacked on the current branch) unless the user
  asks otherwise. Do NOT use for in-place handoffs to the current worktree,
  codex/claude agents, or supervised/multi-agent orchestration.
---

# Orca Spawn

Create a **new, independent Orca worktree** whose first (and only) terminal runs
`pi`, with your instructions delivered as pi's opening prompt. One command does
the whole thing; the variants below cover custom pi flags and cleanup.

## Resolve the Orca executable

Every command below uses `ORCA` as a placeholder for the Orca CLI. Pick it once
and reuse it (same rule as the `orca-cli` skill):

- If `ORCA_CLI_COMMAND` is set, use its value.
- Else, in a dev checkout exposing `ORCA_DEV_REPO_ROOT`, use `orca-dev`.
- Else, on Linux *outside* an Orca-managed terminal, use `orca-ide` (bare `orca`
  there is usually the GNOME screen reader).
- Else, use `orca` (the normal case on macOS, including Orca's own terminals).

If Orca isn't up yet: `ORCA status --json`, then `ORCA open --json` if needed.

## Resolve the repo

The new worktree belongs to one registered Orca repo.

- **Inside an Orca-managed worktree** (check with `ORCA worktree current --json`):
  omit `--repo`; Orca infers it from the shell cwd.
- **Outside one**: pass `--repo <selector>` explicitly. Get the id first:

  ```text
  ORCA repo list --json
  ```

  Then use `--repo id:<repoId>` (or `name:<displayName>` / `path:<absPath>`).

## Spawn (primary path)

One command creates the worktree, launches pi in its first terminal, and sends
the instructions — this is the supported "agent-backed" path and is preferred
over manually create-then-open:

```text
ORCA worktree create --name <task-name> --no-parent --agent pi --prompt "<instructions>" --json
```

- `--no-parent` makes the worktree **independent** (recommended default; it does
  *not* pick the Git base — Orca uses the repo default base branch). Omit
  `--no-parent` / `--parent-worktree` only if the user asks for stacked/related
  work. Use `--parent-worktree active` for an explicit child of the current
  worktree.
- `--agent pi` launches pi in the first terminal. pi runs with its **configured
  defaults** (model, thinking, settings from `~/.pi` and env like `PI_MODEL`).
- `--prompt "<instructions>"` is delivered to pi after the TUI is ready; Orca
  handles the readiness wait internally, so you do **not** add a separate
  `terminal wait`/`send` on this path.
- **Tabs & focus (default = add a tab, don't steal focus):** with no extra
  flag, Orca creates the worktree + its first pi terminal as a *visible tab*
  while leaving the current app view untouched (`startupTerminal.surface`
  comes back `"background"`). That is the desired behavior — **add a tab, keep
  focus where it is.** Do **not** add `--activate`; it switches the app's active
  view to the new worktree (a focus change). Likewise, in the two-step variant
  below, omit `--focus`.

## Read the result

From the `--json` output, capture:

| Field | Meaning |
|-------|---------|
| `result.worktree.id` | Full `<repoId>::<worktreePath>` selector. Copy it whole for `stop`/`rm`/`show`/`send`. Never shorten to the repo id alone. |
| `result.agentTerminalHandle` | Handle of the pi terminal. Fallback: `result.startupTerminal.handle` (older runtimes). |
| `result.worktree.branch` | The new Git branch (e.g. `refs/heads/<user>/<task-name>`). |
| `result.worktree.createdWithAgent` | Confirms `pi` launched (== `"pi"`). |

## Confirm pi is running

```text
ORCA terminal show --terminal <handle> --json     # status "running", title "pi"
ORCA terminal list --worktree id:<repoId>::<path> --json
```

Reading pi's *response* is awkward because pi is a full-screen TUI (alternate
screen) — `ORCA terminal read --terminal <handle> --limit 1000 --json` returns
mostly TUI chrome. To watch for completion, wait for the TUI to go idle rather
than scanning output:

```text
ORCA terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
```

## Variant — custom pi flags (model / thinking / system prompt)

`--agent pi` does not accept pi-specific flags. To spawn with a specific model,
thinking level, or appended system prompt, use the manual two-step and send the
prompt yourself:

```text
ORCA worktree create --name <task-name> --no-parent --json
# result.worktree.id => id:<repoId>::<path>

ORCA terminal create --worktree id:<repoId>::<path> --title pi \
  --command 'pi --model anthropic/claude-sonnet-4 --thinking high' --json
# No --focus: keeps the current view; the pi tab is still created.
# result.terminal.handle => <handle>

ORCA terminal wait --terminal <handle> --for tui-idle --timeout-ms 60000 --json
ORCA terminal send  --terminal <handle> --text "<instructions>" --enter --json
```

Caveat from the Orca guide: a bare `worktree create` (no `--agent`) can leave a
fallback shell tab when the repo has no configured default terminal, and
configured default tabs may add extra surfaces. Prefer the one-liner `--agent`
path unless you genuinely need per-spawn flag overrides; if you must use the
two-step, target the agent handle only.

Tip: for a repeatable model preference, set it once in `~/.pi` config or
`PI_MODEL` and keep using the simple `--agent pi` one-liner.

## Variant — headless pi (process prompt and exit)

If the goal is "run pi to completion and exit" rather than a live, running
instance, spawn with `pi -p` (non-interactive) instead of the TUI:

```text
ORCA worktree create --name <task-name> --no-parent --json
ORCA terminal create --worktree id:<repoId>::<path> --title pi \
  --command 'pi -p "<instructions>"' --json
ORCA terminal wait --terminal <handle> --for exit --timeout-ms 600000 --json
ORCA terminal read  --terminal <handle> --limit 1000 --json
```

This is *not* "a running pi instance" — use it only when the user wants a
fire-and-forget job whose output you then read.

## Send more instructions to the running pi

```text
ORCA terminal send --terminal <handle> --text "<follow-up>" --enter --json
```

Use exactly one handle. If it ever returns `terminal_handle_stale`, re-list with
`ORCA terminal list --worktree <selector> --json` and use the fresh handle;
never dual-send to the old and new handles.

## Cleanup

```text
ORCA terminal stop --worktree id:<repoId>::<path> --json
ORCA worktree rm    --worktree id:<repoId>::<path> --force --json
```

`stop` ends pi; `rm --force` removes the worktree from both Orca and git. Repo
archive hooks are skipped unless you pass `--run-hooks`.

## Worked example (independent pi workspace, default config)

```text
# 1. (only if not inside an Orca-managed worktree) find the repo
ORCA repo list --json                       # => repoId

# 2. spawn (tab added, current view untouched — no --activate)
ORCA worktree create --repo id:<repoId> --name fix-login-bug --no-parent \
  --agent pi --prompt "Reproduce the login 500 in src/auth and send a fix as a commit. Run the auth tests before finishing." \
  --json
#   => worktree.id = "<repoId>::/.../fix-login-bug"
#   => agentTerminalHandle = "term_..."

# 3. later, check on it
ORCA terminal wait   --terminal <handle> --for tui-idle --timeout-ms 180000 --json
ORCA worktree set    --worktree id:<repoId>::/.../fix-login-bug --comment "fix sent; tests green" --json

# 4. done — tear down
ORCA terminal stop   --worktree id:<repoId>::/.../fix-login-bug --json
ORCA worktree rm     --worktree id:<repoId>::/.../fix-login-bug --force --json
```

## Notes

- Always pass `--json` for agent-driven calls and read selectors from the result
  verbatim (copy the full `<repoId>::<path>`; don't reconstruct it).
- `--no-parent` controls only Orca lineage, not the Git base. For independent
  work Orca uses the repo default base branch; add `--base-branch <ref>` only if
  the user names a specific base.
- This skill deliberately overlaps with `orca-cli`. For anything beyond "spawn
  one pi in a fresh workspace" (codex/claude agents, in-place terminals,
  supervised orchestration, browser control), load `orca-cli` instead.
