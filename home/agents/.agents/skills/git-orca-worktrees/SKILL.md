---
name: git-orca-worktrees
description: >-
  Create Git worktrees using Orca first, with plain Git fallback. Use when starting work in
  a new worktree or managing worktree cleanup.
---

# Git and Orca Worktrees

Create worktrees through shared setup script; it uses Orca in the current Orca workspace, then falls back to plain Git when Orca is unavailable or repo is unregistered:

```sh
~/.agents/skills/git-orca-worktrees/setup.sh <name>
```

Read its output for `WORKTREE_PATH`, `BRANCH_NAME`, and `WORKTREE_TOOL`. Orca creation also returns `WORKTREE_ID`; retain full ID for Orca operations. Do not duplicate or bypass script creation logic. For Orca terminal and workspace operations, use `orca-cli`.
