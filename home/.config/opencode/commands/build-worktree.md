---
description: Build a feature in a git worktree, validate locally, push a PR, and iterate until CI passes
---

# Build PR

You are given a task:

**$ARGUMENTS**

Complete this task in an isolated git worktree, validate it, push a PR, and iterate until CI passes.

## Execution Model

Use the **Task tool** (sub-agent) for Phases 1, 2, and 5 (the phases that need code understanding). Run Phases 0, 3, and 4 directly (bash-only). Pass relevant context (branch name, worktree path, PR number, CI logs) to each sub-agent.  Phase 1 may need to be multiple steps executed by multiple sub-agents if either the task instructions ask for it or if it is complex and you judge it to be.

## Phase 0: Setup

1. **Determine prefix**: Infer a branch prefix from the task description. Match on keywords in `$ARGUMENTS`:
   - `feat/` — new feature (default if no match)
   - `fix/` — bug fix, crash, error, regression
   - `chore/` — maintenance, deps, dependencies, upgrade, tooling
   - `refactor/` — restructure, reorganize, rewrite, cleanup (no behavior change)
   - `docs/` — documentation, readme, comments
   - `test/` — tests, coverage, spec, testing
   - `perf/` — performance, speed, optimize, slow
   - `ci/` — CI/CD, pipeline, workflow, github actions
   - `style/` — formatting, lint, prettier (no logic change)
   - `build/` — build system, bundler, compile
   - `design/` — exploratory, prototype, spike
   - `research/` — investigate, research, explore, POC

2. **Sanitize branch name**: Derive the branch slug from the argument — lowercase, replace spaces with hyphens, strip special characters, max 50 chars. Combine: `$PREFIX/$SLUG`. Example: "Add user login" → `feat/add-user-login`

3. **Determine base branch**: Get the default branch with `git symbolic-ref refs/remotes/origin/HEAD --short | sed 's@origin/@@'`. Fall back to `main`.

4. **Create worktree** using worktrunk (`wt`):
   ```bash
   git fetch origin
   wt switch -c $BRANCH_NAME --base $BASE_BRANCH --no-cd
   ```
   This creates a new branch from `origin/$BASE_BRANCH` and a worktree at the path defined in `~/.config/worktrunk/config.toml`.
   Parse the worktree path from the output — all subsequent work happens there.

## Phase 1: Execute the Task

1. **Understand the codebase**: Read AGENTS.md, README, package.json (or equivalent), and explore the project structure — all within the worktree directory.
2. **Implement the task**: Complete the work described in **$ARGUMENTS**. Follow existing code conventions, patterns, and styles.
3. **Commit**: Stage all changes and commit with a descriptive message:
   ```bash
   git add -A && git commit -m "feat: <descriptive message based on the task>"
   ```

## Phase 2: Local Validation

Run validation steps locally before pushing. Discover what validation exists by checking, in order of preference:

1. **.github/workflows/** — read CI workflows to understand what runs and try to replicate locally

3. **package.json** — look for `test`, `lint`, `typecheck`, `check`, `validate`, and `format` scripts
4. **pyproject.toml** / **setup.cfg** — look for test/lint commands
2. **AGENTS.md** — look for test/lint commands documented there

Run each discovered validation command in the worktree. If any fail, fix the issues, commit, and re-run validation until all pass.

## Phase 3: Push PR

1. **Check for remote**: Run `git remote get-url origin`. If it fails, output "No remote repository found. Cannot create a PR. Worktree is ready." and **STOP**.
2. **Push the branch**:
   ```bash
   git push -u origin $BRANCH_NAME
   ```
3. **Create PR**:
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
4. **Commit and push** using worktrunk:
   ```bash
   wt step commit && git push
   ```
5. **Return to Phase 4**: Wait for the new CI run and check again.
6. **Max iterations**: If CI fails 5 times in a row, stop and report all failures to the user.

## Cleanup

Do NOT remove the worktree when done. The user can clean it up later with `wt remove $BRANCH_NAME`.

## Error Cases

- **No remote**: Stop — no PR possible. Worktree remains for local work.
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
