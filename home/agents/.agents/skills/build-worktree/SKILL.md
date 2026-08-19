---
name: build-worktree
description: Build a feature in a git worktree, validate locally, push a PR, and iterate until CI passes. Use when the user wants to implement a task in an isolated worktree with full PR lifecycle management.
license: MIT
compatibility: opencode, pi
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


| Script                                     | Phase | Purpose                                                                                         |
| ------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------- |
| `setup.sh "<branch>"`                      | 0     | Create worktree for branch using `wt` when available, otherwise `git worktree`. Outputs `BRANCH_NAME`, `BASE_BRANCH`, `WORKTREE_TOOL`, `WORKTREE_PATH`               |
| `validate.sh "<worktree>" <cmd...>`        | 2     | Run validation commands in worktree. Exits 0 on pass, 1 on failure                              |
| `push-pr.sh "<branch>" "<title>" "<body>"` | 3     | Push branch + create PR. Outputs PR URL and `PR_NUMBER`                                         |
| `monitor-ci.sh "<branch>" "<pr_number>"`   | 4     | Wait for CI via `gh run watch`, check mergeability. Outputs `CONCLUSION`, `MERGEABLE`, `RUN_ID` |


## Constraints

1. **Never merge a PR without explicit user request.** Stop after CI passes and report the result. Wait for the user to tell you to merge.
2. **Stay on the worktree you created in Phase 0.** Never create additional branches or worktrees. Fix issues in place.

## Execution Model

This is an **orchestrator** — it coordinates bash scripts and delegated agents. Use the host agent's delegation mechanism for AI phases (1, 2.5, 5). The exact tool name and agent parameter differ between hosts; use the host's syntax, but always pass `WORKTREE_PATH` explicitly as `cwd`. Use the helper scripts for mechanical phases (0, 2, 3, 4). The default implementation agent is `build` or its host-equivalent (for example, `worker`); use a user-specified agent type when provided.

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
   bash ~/.agents/skills/build-worktree/setup.sh "$BRANCH_NAME"
  ```

   `setup.sh` checks for `wt` before using it. If `wt` is unavailable, it creates the worktree with `git worktree add`.

Parse the output for `BRANCH_NAME` (may have `-v2` suffix if branch existed), `BASE_BRANCH`, `WORKTREE_TOOL`, and `WORKTREE_PATH`. All subsequent work uses these.

## Phase 1: Execute the Task

Spawn an implementation agent (default: `build`, `worker`, or the host-equivalent) using the host's delegation mechanism. Supply a custom prompt containing:

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

Use focused prompts and pass the worktree as `cwd` on every delegation. Adapt the syntax to the host, but preserve this contract:

```text
delegate(
  agent = "<implementation-or-review-agent>",
  cwd = WORKTREE_PATH,
  prompt = """
    Goal: <specific outcome>
    Task: <full task description>
    Authority: <read/edit/commit/push/review permissions>
    Context: <design docs, validation output, or review reports>
    Success: <observable completion criteria>
    Report: changed files, commands run, failures, and remaining issues
  """
)
```

- If there are multiple independent tasks, spawn multiple agents in parallel. Give each a distinct task and ensure their edits do not overlap. Do not commit until all agents complete their work.
- If there are dependent tasks, spawn agents sequentially. Pass each agent the worktree as `cwd`, the relevant task description, and the prior agent's results. Commit after each agent completes.
- State the agent's authority explicitly: whether it may read, edit, commit, push, or only review. Keep one writer per worktree at a time.

## Phase 2: Local Validation

Discover what validation exists by checking, in order of preference:

1. **.github/workflows/** — read CI workflows to understand what runs and try to replicate locally
2. **package.json** — look for `test`, `lint`, `typecheck`, `check`, `validate`, and `format` scripts
3. **pyproject.toml** / **setup.cfg** — look for test/lint commands
4. **AGENTS.md** — look for test/lint commands documented there

Then run all discovered commands in one call:

```bash
bash ~/.agents/skills/build-worktree/validate.sh "$WORKTREE_PATH" "npm test" "npm run lint" "npm run typecheck"
```

If it exits non-zero, delegate a fix agent with the worktree path passed explicitly as `cwd`. Include the validation output in its custom prompt. Ask it to fix the failures, commit, and report its changes; then re-run. Repeat until all pass **up to 3 times**.  If it continues to fail after these attempts to fix it, give up and explain what went wrong.

## Phase 2.5: Task Review (highly recommended)

Spawn two review agents **in parallel**, each with the worktree path passed explicitly as `cwd` and a focused custom prompt. Use the host-equivalent review roles if these names are unavailable:

1. `**code-quality-reviewer**` subagent — consolidated review of task completion, code quality, security, and test coverage. Pass it:
  - **Worktree path**, **Task description**
  - It will diff against merge-base, read changed files, check for tests, and produce a single report covering all four axes
2. `**design-review**` subagent — verify alignment with design docs. Pass it:
  - **Worktree path**, **Task description**
  - It will diff against merge-base, find any referenced design docs in `notes/design/`, and compare implementation against design

If either review finds issues: delegate a fix agent with the worktree passed as `cwd`, include both review reports in its prompt, then re-run Phase 2 + Phase 2.5. Max 3 review iterations.

Skip this phase only for straightforward tasks.

## Phase 3: Push PR

```bash
bash ~/.agents/skills/build-worktree/push-pr.sh "$BRANCH_NAME" "$TITLE" "$BODY"
```

If output contains `NO_REMOTE`, report that no PR is possible and stop.

**If `git push` fails with an auth or permission error, do NOT attempt SSH, HTTPS, credential helpers, or remote URL modifications.** Stop immediately and ask the user to resolve git push permissions (e.g. `gh auth login`). Once resolved, retry this phase.

The AI must compose the PR title and body (summary of changes). Include design doc link if applicable.

## Phase 4: Monitor CI

```bash
bash ~/.agents/skills/build-worktree/monitor-ci.sh "$BRANCH_NAME" "$PR_NUMBER"
```

Parse output:

- `CONCLUSION=success` → **CI PASSED**, report and stop
- `MERGE_CONFLICT=true` → proceed to Phase 4.5
- `CONCLUSION=<other>` → proceed to Phase 5
- `TIMEOUT` → no CI run appeared, report to user

## Phase 4.5: Resolve Merge Conflicts

Use the **merge-conflict** skill. Rebase and resolve:

```bash
cd $WORKTREE_PATH && git fetch origin "${BASE_BRANCH#origin/}" && git rebase "$BASE_BRANCH"
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

Delegate a fix agent with the worktree passed explicitly as `cwd`. Include the failed CI logs and the allowed scope in its custom prompt. Ask it to analyze the logs, fix the issues, and report its changes. Commit and push:

```bash
cd $WORKTREE_PATH && git add -A && git commit -m "fix: <descriptive message>" && git push
```

Return to Phase 4. Max 5 CI failure iterations before stopping.

## Cleanup

Do NOT remove the worktree. The user cleans up with `wt remove $BRANCH_NAME` when `wt` was used, or `git worktree remove <worktree-path>` with the fallback.

## Error Cases

- **No remote**: `push-pr.sh` outputs `NO_REMOTE` — stop, worktree remains
- **Push auth/permission failure**: Stop and ask user to resolve (e.g. `gh auth login`). Do NOT try SSH, HTTPS, or remote URL changes.
- **Branch already exists**: `setup.sh` appends `-v2`, `-v3`, etc.
- **Worktree creation fails**: Report error and stop
- **`wt` unavailable**: `setup.sh` uses `git worktree add`; remove the worktree later with `git worktree remove <worktree-path>`
- **Push fails**: Report error (likely need rebase)
- **Merge conflict**: Phase 4.5 handles rebase + force push
- **Max CI retries (5)**: Report all accumulated failures and stop

## Reporting

At the end, always report:

- Branch name and worktree path
- PR URL
- CI status (passed/failed)
- If failed: which jobs failed and a summary of attempts made

