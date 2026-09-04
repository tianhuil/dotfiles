---
name: clean-up-orca
description: >-
  Clean up Orca workspaces whose linked GitHub pull requests are closed or
  merged. Use whenever the user asks to clean up, prune, remove, or close stale
  Orca workspaces based on PR status. Inspect every workspace with the Orca CLI,
  remove only non-main worktrees linked to a closed or merged PR, and preserve
  all other workspaces.
---

# Clean up Orca

Use the Orca CLI as the source of truth. This is a destructive cleanup: it
removes matching Orca worktrees and their checkouts, while leaving unrelated
workspaces intact.

## Resolve the CLI

Choose one executable and use it for every command:

- `ORCA_CLI_COMMAND` when set
- `orca-dev` when `ORCA_DEV_REPO_ROOT` is set
- `orca-ide` on Linux outside an Orca-managed terminal
- `orca` otherwise

If the selected executable cannot run, report the exact error and stop. Confirm
Orca is available with `<ORCA> status --json`.

## Find candidates

Fetch the complete workspace inventory:

```text
<ORCA> worktree ps --json
```

Use each entry's `worktreeId`, `isMainWorktree`, and `linkedPR` fields. A
workspace is a candidate only when all of these are true:

1. `isMainWorktree` is `false`.
2. `linkedPR` is present.
3. `linkedPR.state`, case-insensitively, is `closed` or `merged`.

The absence of a linked PR is not evidence that a workspace is stale. Preserve
it. Preserve open, draft, pending, unknown, or missing PR states. Preserve all
main worktrees regardless of PR metadata.

Before mutating anything, print a compact candidate table containing the repo,
workspace name, PR number, PR state, and the exact `worktreeId`. If there are no
candidates, report that no cleanup was needed and stop.

## Remove candidates

For each candidate, use the exact `worktreeId` returned by the inventory—do not
reconstruct or shorten it. First stop any terminals in that workspace, then
remove it:

```text
<ORCA> terminal stop --worktree id:<exact-worktreeId> --json
<ORCA> worktree rm --worktree id:<exact-worktreeId> --force --json
```

A terminal-stop failure caused by there being no live terminals is harmless;
continue to removal. Run removals one at a time. A forced worktree removal is
the Orca operation that closes the workspace and removes its checkout; do not
use raw `git worktree`, filesystem deletion, or terminal commands. Record each
success or failure.

If a removal fails, continue with the remaining candidates and report the
failure. Do not broaden the filter or retry with a different selector.

## Verify

After all attempts, run:

```text
<ORCA> worktree ps --json
```

Verify that every originally selected `worktreeId` is gone. Report removed
workspaces, failures, and the fact that non-candidates were left untouched.
