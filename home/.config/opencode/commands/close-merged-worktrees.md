---
description: Cleans up merged git worktrees by removing branches that have been merged into main/master
---

## Close Merged Worktrees

This command finds all git worktrees, checks which ones have been merged (via PR or git merge), and removes them safely.

## Workflow

1. **List worktrees**: Get all git worktrees in the repository
2. **Check for PRs**: For each worktree branch, check if there's a merged PR using `gh`
3. **Check git merge status**: Verify if branch is merged into main/master
4. **Identify merged worktrees**: Mark worktrees that are merged via PR or git history
5. **Remove safely**: Delete worktrees. **NEVER** using force and **NEVER** delete the git branch.
6. **Report**: Summarize what was removed

## Commands to Use

```bash
# List all git worktrees with details
git worktree list --verbose

# Get current branch of a worktree
git -C /path/to/worktree rev-parse --abbrev-ref HEAD

# Check if branch has an open/merged PR
gh pr list --head branch-name --state all --json number,title,state,mergedAt --jq '.[]'

# Check if branch is merged into main/master
git branch --merged main | grep branch-name

# Check if branch exists on remote
git ls-remote --heads origin branch-name

# Remove worktree (never use force)
git worktree remove /path/to/worktree
```

## Detection Logic

A worktree branch is considered "merged" if EITHER:

1. **PR Merged**: `gh pr list --head <branch> --state merged` returns results
2. **Git Merged**: Branch appears in `git branch --merged main` or `git branch --merged master`

## Safety Rules

- **NEVER use force flags** (`--force`, `-f`) when removing worktrees
- Always use `git worktree remove` without force
- **NEVER** Never remove git branches

## Reporting Format

Report should include:
- Total worktrees found
- Worktrees identified as merged (and why - PR or git merge)
- Worktrees removed successfully
- Any errors encountered
- Remaining active worktrees

## Example Output

```
Found 5 worktrees:
- /repo/main (main) - [SKIP - main branch]
- /repo/feature-auth (feature-auth) - [MERGED - PR #123 merged]
- /repo/feature-ui (feature-ui) - [MERGED - git merge]
- /repo/hotfix (hotfix) - [ACTIVE - PR #12 open]
- /repo/debug (debug) - [ACTIVE - no PR]

Removing merged worktrees...
✓ Removed worktree: /repo/feature-auth
✓ Removed branch: feature-auth
✓ Removed worktree: /repo/feature-ui
✗ Skipped branch deletion for feature-ui (not fully merged locally)

Summary:
- 2 worktrees removed
- 3 worktrees remain active
```
