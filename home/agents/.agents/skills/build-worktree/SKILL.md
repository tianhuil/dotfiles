---
name: build-worktree
description: Build a feature in a git worktree, validate locally, push a PR, and iterate until CI passes. Use when the user wants to implement a task in an isolated worktree with full PR lifecycle management.
license: MIT
compatibility: pi
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

Or reference them by their install path at `~/.agents/skills/build-worktree/`.

### Available Scripts


| Script                                     | Step | Purpose                                                                                                                                                |
| ------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `setup.sh "<branch>"`                      | 0    | Create worktree for branch using `wt` when available, otherwise `git worktree`. Outputs `BRANCH_NAME`, `BASE_BRANCH`, `WORKTREE_TOOL`, `WORKTREE_PATH` |
| `validate.sh "<worktree>" <cmd...>`        | 2    | Run validation commands in worktree. Exits 0 on pass, 1 on failure                                                                                     |
| `push-pr.sh "<branch>" "<title>" "<body>"` | 4    | Push branch + create PR. Outputs PR URL and `PR_NUMBER`                                                                                                |
| `monitor-ci.sh "<branch>" "<pr_number>"`   | 5    | Wait for CI via `gh run watch`, check mergeability. Outputs `CONCLUSION`, `MERGEABLE`, `RUN_ID`                                                        |
| `gh pr merge`                               | 7    | Merge PR only when explicitly requested                                                          |


## Constraints

1. **Do not merge by default.** Merge only when the user explicitly requests merging as part of this task. Otherwise stop after CI passes and report the result.
2. **Stay on the worktree you created in Step 0.** Never create additional branches or worktrees. Fix issues in place.

## Execution Model

This is an **orchestrator** — it coordinates bash scripts and delegated agents. Use Pi's `subagent` tool for AI steps (1, 2, 3, 6), and always pass `WORKTREE_PATH` explicitly as `cwd`. Use the helper scripts for mechanical steps (0, 2, 4, 5). The default implementation agent is `worker`; use a user-specified agent type when provided.

## Step 0: Setup

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
   bash ~/.agents/skills/build-worktree/setup.sh "$BRANCH_NAME"
  ```

   `setup.sh` checks for `wt` before using it. If `wt` is unavailable, it creates the worktree with `git worktree add`.

Parse the output for `BRANCH_NAME` (may have `-v2` suffix if branch existed), `BASE_BRANCH`, `WORKTREE_TOOL`, and `WORKTREE_PATH`. All subsequent work uses these.

## Agent Session Lifecycle

Create these Pi session IDs once, immediately after Step 0:

```bash
BUILD_AGENT_SESSION_ID="$(openssl rand -hex 16)"
CODE_QUALITY_SESSION_ID="$(openssl rand -hex 16)"
REQUIREMENTS_SESSION_ID="$(openssl rand -hex 16)"
```

The names describe the session's role:

- `BUILD_AGENT_SESSION_ID`: the Step 1 worker and every later fix agent.
- `CODE_QUALITY_SESSION_ID`: the code-quality reviewer.
- `REQUIREMENTS_SESSION_ID`: the requirements reviewer.

Keep the IDs in the orchestrator's environment and reuse them for every retry. Never generate a replacement ID for an existing session.

Start a new Pi session with `--session-id`:

```bash
cd "$WORKTREE_PATH" && pi --session-id "$BUILD_AGENT_SESSION_ID" "<initial task>"
```

Continue an existing session with `--session` and its session ID:

```bash
cd "$WORKTREE_PATH" && pi --session "$BUILD_AGENT_SESSION_ID" "[[ORCA_RICH_MD:c77e4dd59f0ccaa6b72135807b622bfd:inline-html:%3Cfollow-up%20task%3E]]"
```

`--session-id` creates the session when absent; `--session` reopens it. With the native `subagent` tool, retain the corresponding `*_SESSION_ID` as the session identity and use the tool's returned run ID only as the resume handle: `runs.run(key, { resume: latestRunId, task: ... })`. A fix agent must resume `BUILD_AGENT_SESSION_ID`, not start a new session.

## Step 1: Execute the Task

Spawn a `worker` agent (or a user-specified agent) with Pi's `subagent` tool. Supply a custom prompt containing:

- **Session**: start it with `BUILD_AGENT_SESSION_ID`; retain the returned run ID as the resume handle for later fix agents.
- **Working directory**: pass the worktree path explicitly as the delegation tool's `cwd`; **ALWAYS** work in that worktree, not in the main branch / worktree.
- **Task description**: the full task text and links to design docs, if any.
- **Instructions**: Read AGENTS.md, README, and package.json; implement the task; do NOT commit.
- **Output**: report changed files, validation commands, failures, and remaining issues.

The subagent is a small autonomous unit. Its instructions:

1. Implement the task in the worktree.
2. If a design doc with `- [ ]` task checklist was provided with the task, mark any items you complete by changing `- [ ]` to `- [x]`.

To commit work in the worktree, run:

```bash
cd $WORKTREE_PATH && git add -A && git commit -m "[[ORCA_RICH_MD:bbe96137ea6c642624fc1bc64f4941b4:inline-html:%3Ctype%3E]]: [[ORCA_RICH_MD:bbe96137ea6c642624fc1bc64f4941b4:inline-html:%3Cdescriptive%20message%3E]]"
```

### Delegated agents

Use focused prompts and pass the worktree as `cwd` on every delegation. Preserve this contract:

```text
subagent({
  agent: "[[ORCA_RICH_MD:c77e4dd59f0ccaa6b72135807b622bfd:inline-html:%3Cimplementation-or-review-agent%3E]]",
  cwd: WORKTREE_PATH,
  task: `
    Goal: <specific outcome>
    Task: <full task description>
    Authority: <read/edit/commit/push/review permissions>
    Context: <design docs, validation output, or review reports>
    Success: <observable completion criteria>
    Report: changed files, commands run, failures, and remaining issues
  `
})
```

- If there are multiple independent tasks, spawn multiple agents in parallel. Give each a distinct task and ensure their edits do not overlap. Do not commit until all agents complete their work.
- If there are dependent tasks, spawn agents sequentially. Pass each agent the worktree as `cwd`, the relevant task description, and the prior agent's results. Commit after each agent completes.
- State the agent's authority explicitly: whether it may read, edit, commit, push, or only review. Keep one writer per worktree at a time.

## Step 2: Local Validation

Discover what validation exists by checking, in order of preference:

1. **.github/workflows/** — read CI workflows to understand what runs and try to replicate locally
2. **package.json** — look for `test`, `lint`, `typecheck`, `check`, `validate`, and `format` scripts
3. **pyproject.toml** / **setup.cfg** — look for test/lint commands
4. **AGENTS.md** — look for test/lint commands documented there

Then run all discovered commands in one call:

```bash
bash ~/.agents/skills/build-worktree/validate.sh "$WORKTREE_PATH" "npm test" "npm run lint" "npm run typecheck"
```

If it exits non-zero, continue `BUILD_AGENT_SESSION_ID` as the fix agent. Pass the worktree path as `cwd` and include the validation output in its follow-up prompt. Ask it to fix the failures, commit, and report its changes; then re-run. Repeat until all pass **up to 3 times**. If the native `subagent` tool returns a new run ID after resuming `BUILD_AGENT_SESSION_ID`, use that latest run ID for the next resume. If it continues to fail after these attempts to fix it, give up and explain what went wrong.

## Step 3: Task Review (highly recommended)

Skip this step only for highly straightforward tasks. Otherwise:

1. Read `prompts/review-code-quality.md` and `prompts/review-requirements.md`.
2. Set the review-round cap from the user's request, or use `5`.
3. Start these reviewer sessions in parallel, passing `WORKTREE_PATH` as `cwd`:
  
  | Reviewer     | Session ID                | Prompt                           |
  | ------------ | ------------------------- | -------------------------------- |
  | Code quality | `CODE_QUALITY_SESSION_ID` | `prompts/review-code-quality.md` |
  | Requirements | `REQUIREMENTS_SESSION_ID` | `prompts/review-requirements.md` |
  

   Keep each session ID paired with its reviewer; never swap them.  A new session will be spawned the first time but re-used in subsequent runs.
4. On every round, have both reviewers inspect the current diff and report whether prior issues are fixed, plus any new evidence-backed issues.
5. If either reviewer finds issues, resume `BUILD_AGENT_SESSION_ID` with both reports, fix the issues, and re-run Step 2. Then resume Step 3 with the same `CODE_QUALITY_SESSION_ID` and `REQUIREMENTS_SESSION_ID` for the next round.
6. Stop when both reviewers approve or the review-round cap is reached.

## Step 4: Push PR

```bash
bash ~/.agents/skills/build-worktree/push-pr.sh "$BRANCH_NAME" "$TITLE" "$BODY"
```

If output contains `NO_REMOTE`, report that no PR is possible and stop.

**If `git push` fails with an auth or permission error, do NOT attempt SSH, HTTPS, credential helpers, or remote URL modifications.** Stop immediately and ask the user to resolve git push permissions (e.g. `gh auth login`). Once resolved, retry this step.

The AI must compose the PR title and body (summary of changes). Include design doc link if applicable.

## Step 5: Monitor CI

```bash
bash ~/.agents/skills/build-worktree/monitor-ci.sh "$BRANCH_NAME" "$PR_NUMBER"
```

Parse output:

- `CONCLUSION=success` → **CI PASSED**; proceed to Step 7 only if user explicitly requested merging, otherwise report and stop
- `MERGE_CONFLICT=true` → proceed to Step 5.5
- `CONCLUSION=<other>` → proceed to Step 6
- `TIMEOUT` → no CI run appeared, report to user

## Step 5.5: Resolve Merge Conflicts

Use the **merge-conflict** skill. Rebase and resolve:

```bash
cd $WORKTREE_PATH && git fetch origin "${BASE_BRANCH#origin/}" && git rebase "$BASE_BRANCH"
```

After resolving conflicts, force push and return to Step 5:

```bash
git push --force-with-lease origin $BRANCH_NAME
```

## Step 6: Fix CI Failures (Loop)

This step requires AI to understand failure logs. Get the details:

```bash
gh run view $RUN_ID --json jobs --jq '.jobs[] | select(.conclusion != "success") | {name: .name, conclusion: .conclusion}'
gh run view $RUN_ID --log-failed
```

Continue `BUILD_AGENT_SESSION_ID` as the fix agent, with the worktree passed explicitly as `cwd`. Include the failed CI logs and the allowed scope in its follow-up prompt. Ask it to analyze the logs, fix the issues, and report its changes. Commit and push:

```bash
cd $WORKTREE_PATH && git add -A && git commit -m "fix: [[ORCA_RICH_MD:aa949d50feb3508a2ff64ba077d1b4c1:inline-html:%3Cdescriptive%20message%3E]]" && git push
```

Return to Step 5. Max 5 CI failure iterations before stopping.

## Step 7: Merge (Only on Explicit Request)

Run this step only when the user explicitly requested merging as part of this task. Otherwise do not merge; stop after Step 5 reports CI passed.

Confirm CI passed and PR is mergeable, then merge using GitHub CLI:

```bash
gh pr merge "$PR_NUMBER" --merge
```

If merge fails or PR is not mergeable, stop and report the error. Do not change merge strategy or force a merge without user approval. Report the resulting merge status.

## Cleanup

Do NOT remove the worktree. The user cleans up with `wt remove $BRANCH_NAME` when `wt` was used, or `git worktree remove [[ORCA_RICH_MD:c77e4dd59f0ccaa6b72135807b622bfd:inline-html:%3Cworktree-path%3E]]` with the fallback.

## Additional Work

You may be given subsequent work to perform.  If you are, after each task, please re-perform steps 2 through 6 before completing.

## Error Cases

- **No remote**: `push-pr.sh` outputs `NO_REMOTE` — stop, worktree remains
- **Push auth/permission failure**: Stop and ask user to resolve (e.g. `gh auth login`). Do NOT try SSH, HTTPS, or remote URL changes.
- **Branch already exists**: `setup.sh` appends `-v2`, `-v3`, etc.
- **Worktree creation fails**: Report error and stop
- `**wt` unavailable**: `setup.sh` uses `git worktree add`; remove the worktree later with `git worktree remove [[ORCA_RICH_MD:c77e4dd59f0ccaa6b72135807b622bfd:inline-html:%3Cworktree-path%3E]]`
- **Push fails**: Report error (likely need rebase)
- **Merge conflict**: Step 5.5 handles rebase + force push
- **Max CI retries (5)**: Report all accumulated failures and stop

## Reporting

At the end, always report:

- Branch name and worktree path
- PR URL
- CI status (passed/failed)
- If failed: which jobs failed and a summary of attempts made

