---
description: Build a feature in a git worktree, validate locally, push a PR, and iterate until CI passes
---

# Build PR

You are given a task: **$ARGUMENTS**

Complete this task in an isolated git worktree, validate it, push a PR, and iterate until CI passes.

## Phase 0: Setup

1. **Sanitize branch name**: Derive a branch name from the argument. Slugify it: lowercase, replace spaces with hyphens, strip special characters, max 50 chars. Prefix with `feat/`. Example: "Add user login" → `feat/add-user-login`
2. **Check for remote**: Run `git remote get-url origin`. If it fails, output "No remote repository found. Cannot create a PR." and **STOP**.
3. **Determine base branch**: Get the default branch with `git symbolic-ref refs/remotes/origin/HEAD --short | sed 's@origin/@@'`. Fall back to `main`.
4. **Create worktree**: Create a new branch from the base and add a worktree:
   ```bash
   git fetch origin $BASE_BRANCH
   git worktree add .wtp/$BRANCH_NAME -b $BRANCH_NAME origin/$BASE_BRANCH
   ```
   All subsequent work happens in the `.wtp/$BRANCH_NAME` directory.

## Phase 1: Execute the Task

1. **Understand the codebase**: Read AGENTS.md, README, package.json (or equivalent), and explore the project structure — all within the worktree directory.
2. **Implement the task**: Complete the work described in **$ARGUMENTS**. Follow existing code conventions, patterns, and styles.
3. **Commit**: Stage all changes and commit with a descriptive message:
   ```bash
   git add -A && git commit -m "feat: <descriptive message based on the task>"
   ```

## Phase 2: Local Validation

Run validation steps locally before pushing. Discover what validation exists by checking, in order of preference:

1. **AGENTS.md** — look for test/lint commands documented there
2. **package.json** — look for `test`, `lint`, `typecheck`, `check`, `validate` scripts
3. **Makefile** — look for `test`, `lint`, `check` targets
4. **pyproject.toml** / **setup.cfg** — look for test/lint commands
5. **scripts/** directory — look for CI-related scripts (test, lint, check)
6. **.github/workflows/** — read CI workflows to understand what runs and try to replicate locally

Run each discovered validation command in the worktree. If any fail, fix the issues, commit, and re-run validation until all pass.

## Phase 3: Push PR

1. **Push the branch**:
   ```bash
   git push -u origin $BRANCH_NAME
   ```
2. **Create PR**:
   ```bash
   gh pr create --title "<descriptive title>" --body "$(cat <<'EOF'
   ## Summary
   - <bullet points describing what was done>

   ## Changes
   - <list of key changes>
   EOF
   )"
   ```
3. **Capture the PR number** from the output.

## Phase 4: Monitor CI

1. **Wait for CI to start**: Poll `gh run list --branch $BRANCH_NAME --limit 1 --json databaseId,status --jq '.[0]'` every 10 seconds until a run appears with status `in_progress` or `completed`.
2. **Poll until completion**: Every 10 seconds, check:
   ```bash
   gh run list --branch $BRANCH_NAME --limit 1 --json status,conclusion --jq '.[0] | {status, conclusion}'
   ```
   - If `status` is `in_progress` or `queued`: sleep 10 and poll again
   - If `status` is `completed` and `conclusion` is `success`: **CI PASSED** — report success and stop
   - If `status` is `completed` and `conclusion` is not `success`: proceed to Phase 5

## Phase 5: Fix CI Failures (Loop)

1. **Get failed job details**:
   ```bash
   gh run view $RUN_ID --json jobs --jq '.jobs[] | select(.conclusion != "success") | {name: .name, conclusion: .conclusion}'
   ```
2. **Get failure logs**:
   ```bash
   gh run view $RUN_ID --log-failed
   ```
3. **Analyze and fix**: Read the logs, understand what failed, and fix the issues in the worktree.
4. **Commit and push**:
   ```bash
   git add -A && git commit -m "fix: resolve CI failure - <brief description>" && git push
   ```
5. **Return to Phase 4**: Wait for the new CI run and check again.
6. **Max iterations**: If CI fails 5 times in a row, stop and report all failures to the user.

## Cleanup

Do NOT remove the worktree when done. The user can clean it up later with the `/close-merged-worktrees` command.

## Error Cases

- **No remote**: Stop immediately — no PR possible
- **Branch already exists**: Use a unique suffix (e.g., append `-2`)
- **Worktree creation fails**: Report the error and stop
- **Push fails**: Report the error (likely need to rebase on base branch)
- **PR creation fails**: Report the error
- **Max CI retries reached**: Report all accumulated failures and stop

## Reporting

At the end, always report:
- Branch name and worktree path
- PR URL
- CI status (passed/failed)
- If failed: which jobs failed and a summary of attempts made
