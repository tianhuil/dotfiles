---
name: git-orca-worktrees
description: >-
  Create Git worktrees using Orca first, with plain Git fallback. Use when starting work in
  a new worktree or managing worktree cleanup.
---

# Git and Orca Worktrees

Create worktrees through shared setup script; it uses Orca in the current Orca workspace, then falls back to plain Git when Orca is unavailable or repo is unregistered:

```sh
~/.agents/skills/git-orca-worktrees/setup.sh [name] [--no-parent]
```

`<name>` is optional. Omitted, it derives a worktree name (and thus branch name) from the latest commit subject on HEAD: lowercased, non-alphanumerics collapsed to dashes, capped at 48 characters. Orca prefixes the user namespace (e.g. `tianhuil/<name>`); the Git fallback uses `<name>` directly and dedups collisions with `-v2` suffixes. Pass an explicit `<name>` to override.

By default the Orca path passes `--parent-worktree active`, so the new workspace is an explicit child of the current Orca workspace. Pass `--no-parent` for an independent top-level workspace (`--no-parent` only sets Orca lineage; base branch is unaffected). The Git fallback has no parent concept and creates an independent worktree.

Read its output for `WORKTREE_PATH`, `BRANCH_NAME`, and `WORKTREE_TOOL`. Orca creation also returns `WORKTREE_ID` and `PARENT_WORKTREE_ID`; retain full IDs for Orca operations. Do not duplicate or bypass script creation logic. For Orca terminal and workspace operations, use `orca-cli`.

Pinning a workspace sidebar card is UI-only: the `orca` CLI has no pin flag (`worktree set` supports `comment`, `workspace-status`, `unread`, etc., but not pin). Pin/unpin in the Orca app.
