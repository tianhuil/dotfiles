---
description: Waits for GitHub Actions to pass, then squash merges the PR to the primary branch. Stops if there are uncommitted or unpushed changes.
---

## Merge When Actions Pass

This command ensures the working tree is clean and all changes are pushed, then waits for GitHub Actions to pass before squash merging the PR to the primary branch.

## Workflow

1. **Check for uncommitted changes**: Run `git status --porcelain` — if any output, stop and tell the user to commit first
2. **Check for unpushed changes**: Compare local and remote branch — if they differ, stop and tell the user to push first
3. **Find the PR**: Use `gh` to find the PR for the current branch
4. **Get the latest workflow run**: Use `gh run list` to get the most recent run for the current branch
5. **Poll Actions status**: Poll the workflow run status every 10 seconds until it completes (`status` is not `in_progress` or `queued`)
6. **Check result**: If the run `conclusion` is not `success`, show failed jobs and stop — the user should fix and re-run this command
7. **Determine primary branch**: Use `gh repo view --json defaultBranchRef` to get the primary branch
8. **Squash merge**: Use `gh pr merge --squash` to merge the PR

## Commands to Use

```bash
# Check for uncommitted changes (empty output = clean)
git status --porcelain

# Check for unpushed changes (empty output = up to date)
git log @{u}..HEAD --oneline

# Get current branch name
git rev-parse --abbrev-ref HEAD

# Find the PR for the current branch
gh pr list --head $(git rev-parse --abbrev-ref HEAD) --json number --jq '.[0].number'

# Get the default/primary branch name
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'

# Get latest workflow run status for current branch
gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId,status,conclusion --jq '.[0]'

# Poll: check if run is still in_progress or queued (repeat every 10 seconds until status is "completed")
gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json status,conclusion --jq '.[0] | {status, conclusion}'
# If status is "in_progress" or "queued", wait 10 seconds and poll again
# If status is "completed" and conclusion is "success", proceed to merge
# If status is "completed" and conclusion is not "success", show failures and stop

# View failed jobs if run failed
gh run view $(gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId --jq '.[0].databaseId') --json jobs --jq '.jobs[] | select(.conclusion != "success") | {name: .name, conclusion: .conclusion}'

# View logs for failed jobs
gh run view $(gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId --jq '.[0].databaseId') --log-failed

# Squash merge the PR
gh pr merge $(gh pr list --head $(git rev-parse --abbrev-ref HEAD) --json number --jq '.[0].number') --squash
```

## Decision Logic

### Uncommitted Changes
```bash
git status --porcelain
```
- If output is **not empty**: "You have uncommitted changes. Please commit them first, then run this command again." — **STOP**
- If output is **empty**: proceed to next check

### Unpushed Changes
```bash
git log @{u}..HEAD --oneline
```
- If output is **not empty**: "You have unpushed commits. Please push them first, then run this command again." — **STOP**
- If output is **empty**: proceed to PR lookup
- If the command errors (no upstream), the branch has not been pushed at all — **STOP** with the same message

### No PR Found
- If `gh pr list` returns no results: "No pull request found for branch `<branch>`. Please create a PR first." — **STOP**

### Actions Polling Loop
Poll the latest workflow run every 10 seconds:
```bash
gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json status,conclusion --jq '.[0] | {status, conclusion}'
```
- If `status` is `"in_progress"` or `"queued"`: run `sleep 10`, then poll again
- If `status` is `"completed"` and `conclusion` is `"success"`: proceed to merge
- If `status` is `"completed"` and `conclusion` is not `"success"`: Show the failed jobs and logs, then "Actions failed. Fix the issues, push, and run this command again." — **STOP**

### Merge
- If all checks pass: squash merge the PR with `gh pr merge --squash`

## Error Cases

- **Uncommitted changes**: Stop — tell user to commit first
- **Unpushed commits**: Stop — tell user to push first
- **No upstream set**: Stop — tell user to push the branch first
- **No PR found**: Stop — tell user to create a PR first
- **Actions failed**: Stop — show logs and tell user to fix and retry
- **Merge conflict**: `gh pr merge` will fail — show the error to the user
