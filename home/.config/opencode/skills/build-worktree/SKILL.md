---
name: build-worktree
description: Build a feature in a git worktree, validate locally, push a PR, and iterate until CI passes. Use when the user wants to implement a task in an isolated worktree with full PR lifecycle management.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: git
---

# Build PR in Git Worktree

Complete a task in an isolated git worktree, validate it, push a PR, and iterate until CI passes.

## Helper Scripts

This skill includes bash scripts that handle the mechanical orchestration (no AI needed). Run them via:

```bash
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
```

Or reference them by their install path at `~/.config/opencode/skills/build-worktree/`.

### Available Scripts

| Script | Phase | Purpose |
|--------|-------|---------|
| `setup.sh "<branch>"` | 0 | Create worktree for branch. Outputs `BRANCH_NAME`, `BASE_BRANCH`, `WORKTREE_PATH` |
| `validate.sh "<worktree>" <cmd...>` | 2 | Run validation commands in worktree. Exits 0 on pass, 1 on failure |
| `push-pr.sh "<branch>" "<title>" "<body>"` | 3 | Push branch + create PR. Outputs PR URL and `PR_NUMBER` |
| `monitor-ci.sh "<branch>" "<pr_number>"` | 4 | Wait for CI via `gh run watch`, check mergeability. Outputs `CONCLUSION`, `MERGEABLE`, `RUN_ID` |

## Execution Model

This is an **orchestrator** — it coordinates bash scripts and subagents. Use the **Task tool** for AI phases (1, 2.5, 5). Use the helper scripts for mechanical phases (0, 2, 3, 4).

## Phase 0: Setup

1. **Determine branch name**: Infer a prefix + slug from the task:
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
   
   Slugify the task: lowercase, hyphens for spaces, strip special chars, max 50 chars. Example: "Add user login" → `feat/add-user-login`

2. **Create worktree**:
   ```bash
   bash ~/.config/opencode/skills/build-worktree/setup.sh "$BRANCH_NAME"
   ```

Parse the output for `BRANCH_NAME` (may have `-v2` suffix if branch existed), `BASE_BRANCH`, and `WORKTREE_PATH`. All subsequent work uses these.

## Phase 1: Execute the Task

Spawn a **`build` subagent** via the Task tool. Pass it:
- **Worktree path**: from Phase 0
- **Task description**: the full task text
- **Instructions**: Read AGENTS.md, README, package.json; implement the task; do NOT commit

After the subagent completes, commit in the worktree:
```bash
cd $WORKTREE_PATH && git add -A && git commit -m "<type>: <descriptive message>"
```

For complex tasks, spawn multiple subagents sequentially with commits after each.

## Phase 2: Local Validation

Discover what validation exists by checking, in order of preference:
1. **.github/workflows/** — read CI workflows to understand what runs and try to replicate locally
2. **package.json** — look for `test`, `lint`, `typecheck`, `check`, `validate`, and `format` scripts
3. **pyproject.toml** / **setup.cfg** — look for test/lint commands
4. **AGENTS.md** — look for test/lint commands documented there

Then run all discovered commands in one call:
```bash
bash ~/.config/opencode/skills/build-worktree/validate.sh "$WORKTREE_PATH" "npm test" "npm run lint" "npm run typecheck"
```

If it exits non-zero, spawn a `build` subagent to fix the failures, commit, and re-run. Repeat until all pass.

## Phase 2.5: Task Review (optional)

Spawn a **`build` subagent** to verify the task was accomplished. Pass it:
- **Worktree path**, **Task description**
- **Instructions**: Read the git diff, verify each requirement is MET or UNMET, check for gaps

If unmet requirements: spawn another subagent to fix, re-run Phase 2 + Phase 2.5. Max 3 review iterations.

Skip this phase for straightforward tasks.

## Phase 3: Push PR

```bash
bash ~/.config/opencode/skills/build-worktree/push-pr.sh "$BRANCH_NAME" "$TITLE" "$BODY"
```

If output contains `NO_REMOTE`, report that no PR is possible and stop.

The AI must compose the PR title and body (summary of changes). Include design doc link if applicable.

## Phase 4: Monitor CI

```bash
bash ~/.config/opencode/skills/build-worktree/monitor-ci.sh "$BRANCH_NAME" "$PR_NUMBER"
```

Parse output:
- `CONCLUSION=success` → **CI PASSED**, report and stop
- `MERGE_CONFLICT=true` → proceed to Phase 4.5
- `CONCLUSION=<other>` → proceed to Phase 5
- `TIMEOUT` → no CI run appeared, report to user

## Phase 4.5: Resolve Merge Conflicts

Use the **merge-conflict** skill. Rebase and resolve:

```bash
cd $WORKTREE_PATH && git fetch origin $BASE_BRANCH && git rebase origin/$BASE_BRANCH
```

After resolving conflicts, force push and return to Phase 4:
```bash
git push --force-with-lease origin $BRANCH_NAME
```

## Phase 5: Fix CI Failures (Loop)

This phase requires AI to understand failure logs. Get the details:

```bash
gh run view $RUN_ID --json jobs --jq '.jobs[] | select(.conclusion != "success") | {name: .name, conclusion: .conclusion}'
gh run view $RUN_ID --log-failed
```

Spawn a **`build` subagent** to analyze logs and fix issues in the worktree. Commit and push:
```bash
cd $WORKTREE_PATH && git add -A && git commit -m "fix: <descriptive message>" && git push
```

Return to Phase 4. Max 5 CI failure iterations before stopping.

## Cleanup

Do NOT remove the worktree. The user cleans up with `wt remove $BRANCH_NAME`.

## Error Cases

- **No remote**: `push-pr.sh` outputs `NO_REMOTE` — stop, worktree remains
- **Branch already exists**: `setup.sh` appends `-v2`, `-v3`, etc.
- **Worktree creation fails**: Report error and stop
- **Push fails**: Report error (likely need rebase)
- **Merge conflict**: Phase 4.5 handles rebase + force push
- **Max CI retries (5)**: Report all accumulated failures and stop

## Reporting

At the end, always report:
- Branch name and worktree path
- PR URL
- CI status (passed/failed)
- If failed: which jobs failed and a summary of attempts made
