---
description: Merge a worktree branch back to main using worktrunk. Run after /build-worktree.
---

# Merge Worktree

Merge a worktree branch into the default branch and clean up using `wt merge`.

Use the branch name from the prior `/build-worktree` session (it's in context). If `$ARGUMENTS` is provided, use that instead. If you cannot safely infer it, prompt the user for the branch

## Execution Model

Use the **Task tool** (sub-agent) for conflict resolution. Run everything else directly.

## Workflow

1. **Find worktree path**: Run `git worktree list` to get the feature worktree path for $BRANCH_NAME.
2. **Fetch latest**: `git fetch origin`
3. **Merge**: Run `wt merge` from the feature worktree:
   ```bash
   wt -C $FEATURE_WT_PATH merge
   ```

`wt merge` handles: committing uncommitted changes, squashing, rebasing onto target, fast-forward merge, and cleanup.

If `wt merge` fails with rebase conflicts:
1. Get conflicting files: `git -C $FEATURE_WT_PATH diff --name-only --diff-filter=U`
2. Launch a sub-agent to resolve — load the `merge-conflict` skill and follow its instructions
3. After resolution: `git -C $FEATURE_WT_PATH add -A && git -C $FEATURE_WT_PATH rebase --continue`
4. Re-run `wt -C $FEATURE_WT_PATH merge`

## Error Cases

- **No worktree found**: "No worktree for $BRANCH_NAME. Run `/build-worktree` first."
- **Conflict resolution fails**: Report unresolved files and stop
- **wt merge fails**: Report the error and stop
