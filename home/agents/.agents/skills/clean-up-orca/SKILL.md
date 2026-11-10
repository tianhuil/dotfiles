---
name: clean-up-orca
description: >-
  Clean up Orca workspaces whose linked pull requests are closed or merged, or
  whose branches are merged into the default branch according to Git. Use
  whenever the user asks to clean up, prune, remove, or close stale Orca
  workspaces based on PR or Git status. Inspect every workspace with the Orca
  CLI, remove only non-main worktrees confirmed merged by PR metadata or Git,
  and preserve all other workspaces.
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

Use each entry's `worktreeId`, `isMainWorktree`, `linkedPR`, branch, repository,
and default-branch fields. A workspace is a candidate only when all of these
are true:

1. `isMainWorktree` is `false`.
2. It is confirmed merged by either:
   - `linkedPR` is present and `linkedPR.state`, case-insensitively, is
     `closed` or `merged`; or
   - the workspace branch tip is an ancestor of the repository's default branch
     according to Git. Use `git merge-base --is-ancestor <branch> <default>`;
     do not use `gh` or infer merge status from names, timestamps, or activity.
3. Git checks use the repository and refs for that workspace. If the branch,
   default branch, or ancestry cannot be verified, preserve the workspace.

A missing linked PR is not evidence that a workspace is stale, but it may still
be removed when Git confirms that its branch is merged. Preserve open, draft,
pending, unknown, or missing PR states when Git does not independently confirm
merge status. Preserve all main worktrees regardless of PR or Git metadata.

Before mutating anything, print a compact candidate table containing the repo,
workspace name, merge reason (`PR` or `Git`), PR number/state when present, and
the exact `worktreeId`. If there are no candidates, report that no cleanup was
needed and stop.

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
