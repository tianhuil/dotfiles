---
description: Pushes current branch to GitHub as Pull Request (PR) and debugs failed Actions until they pass
---

## Push Branch & Debug Actions

This command pushes the current branch to GitHub and monitors the GitHub Actions run, providing debugging assistance for any failures.

## Workflow

1. **Push branch**: Push the current branch to GitHub with upstream tracking
2. **Get Actions run**: Retrieve the most recent workflow run for the current branch
3. **Monitor status**: Check if the run completed successfully
4. **Debug failures**: If failed, show logs and help fix issues
5. **Retry**: Re-run failed jobs after fixes

## Commands to Use

```bash
# Get current branch name
git rev-parse --abbrev-ref HEAD

# Push branch with upstream tracking
git push -u origin $(git rev-parse --abbrev-ref HEAD)

# Get latest workflow run ID for current branch
gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId --jq '.[0].databaseId'

# Watch workflow run
gh run watch $(gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId --jq '.[0].databaseId')

# Get failed jobs
gh run view $(gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId --jq '.[0].databaseId') --json jobs --jq '.jobs[] | select(.conclusion != "success") | {name: .name, conclusion: .conclusion}'

# View logs for failed jobs
gh run view $(gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId --jq '.[0].databaseId') --log-failed

# Rerun failed jobs
gh run rerun $(gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId --jq '.[0].databaseId') --failed

# Re-run entire workflow
gh run rerun $(gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 1 --json databaseId --jq '.[0].databaseId')
```

## Debugging Approach

When Actions fail:

1. **Identify the failure**: Check which job/step failed
2. **Show relevant logs**: Display logs from failed steps
3. **Analyze the error**: Understand what went wrong (syntax, dependency, test failure, etc.)
4. **Propose fix**: Suggest code changes or configuration updates
5. **Commit and push**: Create a commit with the fix and push it
6. **Monitor new run**: Watch the new workflow run to verify the fix
7. **Repeat**: Continue until all Actions pass

## Common Failure Types

- **Syntax errors**: Missing brackets, typos in config files
- **Dependency issues**: Missing packages, version conflicts
- **Test failures**: Unit tests, integration tests failing
- **Linting errors**: ESLint, Prettier, Ruff violations
- **Environment issues**: Missing secrets, wrong OS/matrix
- **Timeouts**: Jobs running too long

## Success Criteria

- Branch pushed successfully to GitHub
- All GitHub Actions jobs complete successfully
- No failed tests, lint errors, or other issues
- User is notified of successful Actions run
