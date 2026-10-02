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

Complete a task in an isolated worktree, validate it, push a PR, and iterate until CI passes. Follow `git-orca-worktrees` for worktree creation and cleanup: Orca by default, plain Git fallback.

## Helper Scripts

This skill includes bash scripts that handle the mechanical orchestration (no AI needed). Run them via:

```bash
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
```

Or reference them by their install path at `~/.agents/skills/build-worktree/`.

### Available Scripts


| Script                                     | Step | Purpose                                                                                                                                                |
| ------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `git-orca-worktrees/setup.sh "<name>"`      | 0    | Create Orca worktree, falling back to plain Git. Outputs `BRANCH_NAME`, `BASE_BRANCH`, `WORKTREE_TOOL`, `WORKTREE_PATH`, and Orca `WORKTREE_ID` |
| `validate.sh "<worktree>" <cmd...>`        | 2    | Run validation commands in worktree. Exits 0 on pass, 1 on failure                                                                                     |
| `push-pr.sh "<branch>" "<title>" "<body>"` | 4    | Push branch + create PR. Outputs PR URL and `PR_NUMBER`                                                                                                |
| `monitor-ci.sh "<branch>" "<pr_number>"`   | 5    | Wait for CI via `gh run watch`, check mergeability. Outputs `CONCLUSION`, `MERGEABLE`, `RUN_ID`                                                        |
| `gh pr merge`                               | 7    | Merge PR only when explicitly requested                                                          |


## Constraints

1. **Do not merge by default.** Merge only when the user explicitly requests merging as part of this task, and only when the build status is `READY` (Step 3.5). Otherwise stop after CI passes and report the result.
2. **Stay on the worktree you created in Step 0.** Never create additional branches or worktrees, except the disposable detached worktrees reviewers create and remove for absence checks. Fix issues in place.
3. **Fail closed.** Missing evidence means not done. Never waive a failing check as "environmental", "flaky", "known OOM", or "unrelated". Clean up only processes you started, re-run once, and if it still fails, set status `BLOCKED` and escalate to the user.
4. **Nobody grades their own work.** Workers never choose which design checkboxes get ticked (Step 3.5 does that mechanically), never weaken protected paths (gates, manifests, required-case lists, golden/expected files, acceptance tests: removing cases, adding skips, loosening assertions or thresholds, or editing expected values to match new output) unless the design or the user's task names that change, and never decide the task is complete. Adding cases and regenerating generated files are allowed; the requirements reviewer checks every protected-path change. Reviewers decide; the orchestrator records.
5. **The orchestrator does not edit project files.** Every change to the worktree is made by a delegated agent, so the reviewers always review someone else's work. The orchestrator may run read-only commands, the helper scripts, and verification commands.
6. **Report what was not verified.** Every report and PR body lists anything that could not be observed directly.

## Execution Model

This is an **orchestrator** — it coordinates bash scripts and delegated agents. Use Pi's `subagent` tool for AI steps (1, 2, 3, 6), and always pass `WORKTREE_PATH` explicitly as `cwd`. Use the helper scripts for mechanical steps (0, 2, 4, 5). The default implementation agent is `worker`; use a user-specified agent type when provided.

Reviewers must be able to run shell commands (they execute verification and acceptance steps), and should use a stronger model tier than the worker. A reviewer on the same cheap model as the worker tends to approve the worker's blind spots. Use the user's model choice when given.

Use the `build-reviewer` agent for both reviewers. It has shell access, pins a stronger model, and may not edit the checkout. Do **not** use the built-in `reviewer` agent: it has no shell and is told not to run commands, so it cannot execute the verification this skill requires. If `build-reviewer` is unavailable (`subagent({ action: "list" })`; it is installed from the user's dotfiles), use `oracle` with `context: "fresh"` and `model: "openai-codex/gpt-6-sol"`, paste the rules from the `build-reviewer` agent into the task, state review-only authority, and say so in the final report.

Keep the host responsive: only the requirements reviewer runs commands that build, test, or start servers. The code-quality reviewer reads code and diffs only; it does not run tests, because both reviewers share one worktree and its build output.

**Docs-only changes.** When the diff touches only Markdown files outside the protected paths, use one requirements reviewer and no code-quality reviewer, skip the absence check and dev servers, and use read-only commands (`grep`, `git diff`) as evidence. `VERIFY_COMMAND` is not required.

### Build status

Track one status for the task and report it everywhere:

- `IN_PROGRESS`: work or review is ongoing, or review has not run.
- `READY`: on the current `HEAD` with a clean working tree, the reviewers and the final full review returned PASS, `VERIFY_COMMAND` passed, and the acceptance procedure passed, or it is not applicable with a stated reason that the requirements reviewer confirmed from the diff (no user-visible or integration surface changed).
- `BLOCKED`: any of the above is missing when a cap is reached, a check cannot run, or a precondition fails. `BLOCKED` work may be pushed as a **draft** PR for visibility but is never merged.

`READY` covers one PR. When the design names an owner approval point (for example the end of a large-design phase), merged PRs do not complete that phase: report "awaiting owner acceptance" until the owner has run the Owner Acceptance Script.

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
   bash ~/.agents/skills/git-orca-worktrees/setup.sh "$BRANCH_NAME"
   ```

   This helper owns Orca-first creation and Git fallback. Follow `git-orca-worktrees` for its behavior and output fields. Use `WORKTREE_PATH` as the checkout; retain `WORKTREE_ID` for Orca operations.

Parse the output for `BRANCH_NAME` (may have `-v2` suffix if branch existed), `BASE_BRANCH`, `WORKTREE_TOOL`, and `WORKTREE_PATH`. All subsequent work uses these. If `BASE_BRANCH` is empty, set it from `git -C "$WORKTREE_PATH" symbolic-ref refs/remotes/origin/HEAD --short`. Reviewers get `EXPECTED_BRANCH="$BRANCH_NAME"`.

## Step 0.5: Preconditions and Contract

Before any implementation, collect the contract the reviewers will enforce. Read the repository's `AGENTS.md` and README in the worktree, and every design doc linked by the task.

1. **Design readiness.** For each design the task *implements* (not docs the task itself edits, such as a task to resolve a design's TODOs), run `grep -n "\[TODO:" <design-doc>`. Any hit means the design is not ready: stop, report the open TODOs, and ask the user. For a large design (one with a Review Record section), also require an owner approval line, `Approved-by: <owner> <date>` (`grep -n "^Approved-by:" <design-doc>`). A reviewer's APPROVE verdict does not count. If it is missing, stop and ask the owner to approve the design.
2. **Scope and requirement rows.** These decide what "done" means, so they are copied, never summarized.
   - `DESIGN_SCOPE`: the design file and the work unit this task implements. A work unit is either a heading (for example `### Phase 1.2`) or a single checklist item (for example `1.1.3` or `P1-03`). If the task links a design but does not name the unit, or the unit does not exist, stop and ask the user.
   - `REQUIREMENT_IDS`: for a heading, every checklist line (`- [ ]` or `- [x]`) under it, down to the next heading of the same or higher level; for a single item, that line plus any lines nested under it. Quote each line in full with its ID. Lines without an ID get a positional ID, `§<heading>#<n>` (for example `§Phase 1.2#3`), counted in document order. Record the total (for example "7 items").
   - No design: the rows are the user's task text, split into its individual asks and quoted verbatim (`TASK#1`, `TASK#2`, …). Do not rephrase or add your own.
   - `MANIFEST_CASES`: if the design has a required-case manifest, the manifest file and the selector for this unit's cases (for example `phase1-manifest.json`, `phase == "1.2"`), with their count. When the manifest only tags a coarser unit than this task (cases tagged `1.1`, task `1.1.3`), record "checked at completion of `<coarser unit>`". The PR that completes that coarser unit (its last item) uses the full selector. Otherwise "none".
3. **Verify command.** Use the single verify command the repository's `AGENTS.md` defines (for example `pnpm verify`). If none is defined, derive the command list from CI (Step 2) and say in the final report that the repository lacks one.
4. **Acceptance procedure.** From the design's Owner Acceptance Script and Acceptance Environment, or the repository's `AGENTS.md`, record how to check the change end to end in the environment the user actually uses (real URLs, real browser). For changes with no user-visible or integration surface, record "not applicable" and why; the requirements reviewer must confirm that from the diff. If the procedure needs a browser, probe for it in the worktree now (for example `command -v agent-browser && agent-browser --version`, or the repository's browser test command). If the probe fails, set status `BLOCKED` ("owner acceptance required: no browser tool") now rather than spending review rounds.

   Changes to CI workflow files can only be proven by a CI run. For those rows, push a draft PR (Step 4) before review; the requirements reviewer then cites the CI run for `EXPECTED_HEAD` (`gh run list --commit <sha> --json conclusion,headSha`) as executed evidence.
5. **Protected paths.** Record the gate, manifest, required-case, golden/expected, and acceptance-test paths from the design and `AGENTS.md`, as single-quoted git pathspecs (for example `':(glob)**/*.test.ts' 'scripts/verify.ts'`) so deleted files still match.

Keep these items in the orchestrator's environment as `DESIGN_DOCS`, `DESIGN_SCOPE`, `REQUIREMENT_IDS`, `MANIFEST_CASES`, `VERIFY_COMMAND`, `ACCEPTANCE_PROCEDURE`, and `PROTECTED_PATHS`. Pass them to every worker and reviewer.

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
cd "$WORKTREE_PATH" && pi --session "$BUILD_AGENT_SESSION_ID" "<follow-up task>"
```

`--session-id` creates the session when absent; `--session` reopens it. With the native `subagent` tool, retain the corresponding `*_SESSION_ID` as the session identity and use the tool's returned run ID only as the resume handle: `runs.run(key, { resume: latestRunId, task: ... })`. A fix agent must resume `BUILD_AGENT_SESSION_ID`, not start a new session.

## Step 1: Execute the Task

Spawn a `worker` agent (or a user-specified agent) with Pi's `subagent` tool. Supply a custom prompt containing:

- **Session**: start it with `BUILD_AGENT_SESSION_ID`; retain the returned run ID as the resume handle for later fix agents.
- **Working directory**: pass the worktree path explicitly as the delegation tool's `cwd`; **ALWAYS** work in that worktree, not in the main branch / worktree.
- **Task description**: the full task text, links to design docs, and `DESIGN_SCOPE`, `REQUIREMENT_IDS`, `MANIFEST_CASES`, `VERIFY_COMMAND`, and `PROTECTED_PATHS` from Step 0.5.
- **Instructions**: Read AGENTS.md, README, and package.json; implement the task; do NOT commit.
- **Output**: report changed files, validation commands with their actual results, failures, remaining issues, and anything not verified.

The subagent is a small autonomous unit. Its instructions:

1. Implement the task in the worktree.
2. Do not tick design checkboxes and do not declare the task complete; the reviewers decide.
3. Do not weaken protected paths (remove cases, skip, loosen, or edit expected values to match new output) unless the design or the user's task names that change. Adding cases and regenerating generated files are fine. If a protected check looks wrong, report it instead of changing it.
4. Do not waive failing checks. Report them with the exact error.
5. Stop only processes you started, by PID; other sessions share the machine.

Commit the worker's changes before validation and review, so reviewers see a clean tree at a known commit. Stage the files the worker reported, then confirm nothing else is left:

```bash
cd "$WORKTREE_PATH" && git add -- <reported files> && git status --porcelain
# Unexpected leftovers: ask the worker what they are before committing anything else.
git commit -m "<type>: <descriptive message>"
```

### Delegated agents

Use focused prompts and pass the worktree as `cwd` on every delegation. Preserve this contract:

```text
subagent({
  agent: "<implementation-or-review-agent>",
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

Use `VERIFY_COMMAND` from Step 0.5. Only when the repository defines none, discover what validation exists by checking, in order of preference:

1. **.github/workflows/** — read CI workflows to understand what runs and replicate every step locally
2. **package.json** — look for `test`, `lint`, `typecheck`, `check`, `validate`, and `format` scripts
3. **pyproject.toml** / **setup.cfg** — look for test/lint commands

Then run the commands in one call:

```bash
bash ~/.agents/skills/build-worktree/validate.sh "$WORKTREE_PATH" "$VERIFY_COMMAND"
# or, without a repository verify command:
bash ~/.agents/skills/build-worktree/validate.sh "$WORKTREE_PATH" "npm test" "npm run lint" "npm run typecheck"
```

Do not drop a command because it is slow, memory-hungry, or failed for "environmental" reasons. If a failure looks environmental (port in use, out of memory, stale server), stop only processes this task started, re-run once, and if it still fails, set status `BLOCKED` and report the exact error. A skipped command is reported as not verified, never as passed.

If it exits non-zero, continue `BUILD_AGENT_SESSION_ID` as the fix agent. Pass the worktree path as `cwd` and include the validation output in its follow-up prompt. Ask it to fix the failures, commit, and report its changes; then re-run. Repeat until all pass **up to 3 times**. If the native `subagent` tool returns a new run ID after resuming `BUILD_AGENT_SESSION_ID`, use that latest run ID for the next resume. If it continues to fail after these attempts to fix it, set status `BLOCKED`, skip Step 3, push only a draft PR (Step 4), and explain what went wrong.

## Step 3: Task Review (required)

Always run this step. Skip it only when the user explicitly says to; the status then stays `IN_PROGRESS` (unreviewed), never `READY`.

1. Read `prompts/review-code-quality.md` and `prompts/review-requirements.md`. Fill every placeholder, including `TASK_DESCRIPTION` (the user's full task text, unedited), `BASE_BRANCH`, `EXPECTED_BRANCH`, and `EXPECTED_HEAD` (`git -C "$WORKTREE_PATH" rev-parse HEAD` after the latest commit) and the Step 0.5 values. Pass design docs and requirement IDs as given; do not summarize or restate them.
2. Set the review-round cap from the user's request, or use `5`. The count carries across re-entries from Steps 5.5 and 6; it does not reset.
3. Start these reviewer sessions in parallel (only the requirements reviewer for docs-only changes), passing `WORKTREE_PATH` as `cwd`, with shell access and a stronger model tier than the worker (see Execution Model):
  
  | Reviewer     | Agent            | Session ID                | Prompt                           |
  | ------------ | ---------------- | ------------------------- | -------------------------------- |
  | Code quality | `build-reviewer` | `CODE_QUALITY_SESSION_ID` | `prompts/review-code-quality.md` |
  | Requirements | `build-reviewer` | `REQUIREMENTS_SESSION_ID` | `prompts/review-requirements.md` |
  

   Keep each session ID paired with its reviewer; never swap them.  A new session will be spawned the first time but re-used in subsequent runs.
4. On every round, have both reviewers inspect the current diff and report whether prior issues are fixed, plus any new evidence-backed issues. Give them the new `EXPECTED_HEAD` each round; a report against a different commit does not count.
5. If either reviewer finds issues, resume `BUILD_AGENT_SESSION_ID` with both reports, fix the issues, and re-run Step 2. Then resume Step 3 with the same `CODE_QUALITY_SESSION_ID` and `REQUIREMENTS_SESSION_ID` for the next round. Do not accept a fix agent's claim that something is fixed; the next review round checks it.
6. When both reviewers approve after more than one round, run one **final full review** with a fresh requirements-reviewer session (new session ID) against the final `HEAD`, including the absence check. Resumed reviewers tend to check only their earlier findings; the fresh one reviews the whole change. Its FAIL starts another round. If round 1 passed, it already was a fresh full review; skip this.
7. Stop when both reviewers and the final full review pass on the same `HEAD`, or when the review-round cap is reached. **Reaching the cap with any FAIL or UNVERIFIED sets status `BLOCKED`.** Do not continue to a ready PR or a merge.

## Step 3.5: Readiness Decision

Set the build status from evidence, not from any agent's summary:

- `READY` only when, on the current `HEAD` with a clean working tree (`git status --porcelain` is empty): both reviewers and the final full review returned PASS; `VERIFY_COMMAND` passed; and the acceptance procedure passed, as recorded step by step in the requirements review (or is not applicable, as confirmed by the requirements reviewer).
- Otherwise `BLOCKED`, with the missing items listed.

When the status is `READY`, record `READY_HEAD="$(git -C "$WORKTREE_PATH" rev-parse HEAD)"`, then delegate to a fresh `worker` session (not `BUILD_AGENT_SESSION_ID`) one commit that ticks each design `- [ ]` item the final requirements review marked MET, citing its evidence in the commit message. Items not MET stay unticked, and OWNER items are never ticked by agents: list them in the PR body for the owner. Check that commit mechanically before accepting it:

```bash
git -C "$WORKTREE_PATH" diff --name-only "$READY_HEAD" HEAD   # only files in DESIGN_DOCS
git -C "$WORKTREE_PATH" diff -U0 "$READY_HEAD" HEAD            # only "- [ ]" -> "- [x]" on MET IDs
```

If the commit passes both checks, it keeps `READY`. Anything else, or any other change after `READY`, returns the status to `IN_PROGRESS`. Record `FINAL_HEAD="$(git -C "$WORKTREE_PATH" rev-parse HEAD)"`: this is the only commit that may merge.

## Step 4: Push PR

```bash
# READY:
bash ~/.agents/skills/build-worktree/push-pr.sh "$BRANCH_NAME" "$TITLE" "$BODY"
# BLOCKED or unreviewed: open a draft so it cannot be mistaken for finished work
PR_DRAFT=1 bash ~/.agents/skills/build-worktree/push-pr.sh "$BRANCH_NAME" "$TITLE" "$BODY"
```

If output contains `NO_REMOTE`, report that no PR is possible and stop.

If a PR already exists for the branch (for example an earlier draft), do not create another. Push, then update it to match the current status. Do this every time the status or `HEAD` changes, including after Steps 5.5 and 6:

```bash
git -C "$WORKTREE_PATH" push
PR_NUMBER="$(gh pr view "$BRANCH_NAME" --json number --jq .number)"
gh pr edit "$PR_NUMBER" --body "$BODY"
gh pr ready "$PR_NUMBER"          # when READY
gh pr ready "$PR_NUMBER" --undo   # when BLOCKED or IN_PROGRESS
```

**If `git push` fails with an auth or permission error, do NOT attempt SSH, HTTPS, credential helpers, or remote URL modifications.** Stop immediately and ask the user to resolve git push permissions (e.g. `gh auth login`). Once resolved, retry this step.

The AI must compose the PR title and body. Use this structure, copying tables from the final reviews rather than rewriting them:

```markdown
**Status:** READY @ <FINAL_HEAD full sha> | BLOCKED (<what is missing>) | IN_PROGRESS (unreviewed)

## Summary
<what changed and why; design doc link>

## Requirements (from the final requirements review)
| ID | Evidence | Status |
|----|----------|--------|

## Verification
- `<VERIFY_COMMAND>` → <exit code and summary>
- Acceptance procedure → <each step and observed result, or "not applicable: <reason>">

## For the owner to check
- <each OWNER row: ID and what to check, or "Nothing.">

## Not verified
- <anything not observed directly, or "Nothing.">
```

## Step 5: Monitor CI

```bash
bash ~/.agents/skills/build-worktree/monitor-ci.sh "$BRANCH_NAME" "$PR_NUMBER" "$(git -C "$WORKTREE_PATH" rev-parse HEAD)"
```

The script waits for the CI run of that exact commit, so a result from an earlier push is never mistaken for this one. Parse output:

- `CONCLUSION=success` → **CI PASSED**; proceed to Step 7 only if user explicitly requested merging and status is `READY`, otherwise report and stop
- `MERGE_CONFLICT=true` → proceed to Step 5.5
- `CONCLUSION=<other>` → proceed to Step 6
- `TIMEOUT` → no CI run appeared, report to user

## Step 5.5: Resolve Merge Conflicts

Resume `BUILD_AGENT_SESSION_ID` to rebase and resolve with the **resolve-merge-conflict** skill (the orchestrator does not edit files):

```bash
cd $WORKTREE_PATH && git fetch origin "${BASE_BRANCH#origin/}" && git rebase "$BASE_BRANCH"
```

Conflicts in design docs, `AGENTS.md`, or protected paths mean someone else changed the contract. Do not resolve them by picking the version that matches this implementation: stop, set status `BLOCKED`, and ask the user.

A rebase always changes `HEAD` and has not been tested on the new base, so status returns to `IN_PROGRESS`: mark the PR draft first, then repeat Steps 2, 3 (one round is usually enough), 3.5, and 4's PR update before Step 5:

```bash
gh pr ready "$PR_NUMBER" --undo && gh pr edit "$PR_NUMBER" --body "<body with Status: IN_PROGRESS>"
git push --force-with-lease origin $BRANCH_NAME
```

## Step 6: Fix CI Failures (Loop)

This step requires AI to understand failure logs. Get the details:

```bash
gh run view $RUN_ID --json jobs --jq '.jobs[] | select(.conclusion != "success") | {name: .name, conclusion: .conclusion}'
gh run view $RUN_ID --log-failed
```

Continue `BUILD_AGENT_SESSION_ID` as the fix agent, with the worktree passed explicitly as `cwd`. Include the failed CI logs and the allowed scope in its follow-up prompt. Ask it to analyze the logs, fix the issues, and report its changes. Commit the reported files (as in Step 1) and push:

```bash
cd "$WORKTREE_PATH" && git add -- <reported files> && git status --porcelain
git commit -m "fix: <descriptive message>"
gh pr ready "$PR_NUMBER" --undo && gh pr edit "$PR_NUMBER" --body "<body with Status: IN_PROGRESS>"
git push
```

Return to Step 5. Max 5 CI failure iterations before stopping. A CI fix is a code change: the status returns to `IN_PROGRESS`, and Steps 2, 3, 3.5, and 4's PR update run again (one review round is usually enough) before merging. A fix must not weaken tests, gates, or CI configuration to get green.

## Step 7: Merge (Only on Explicit Request)

Run this step only when the user explicitly requested merging as part of this task. Otherwise do not merge; stop after Step 5 reports CI passed.

Confirm all of the following, then merge using GitHub CLI:

- status is `READY`, the PR's head is `FINAL_HEAD` (Step 3.5), and the PR is not a draft;
- CI passed on `FINAL_HEAD` (Step 5 with that SHA), and the PR is mergeable.

A standing instruction such as "merge automatically" or "no human review" does not override these checks. If any is missing, do not merge; report status `BLOCKED` and why. Merging does not complete a phase that names an owner approval point (see Build status).

```bash
gh pr merge "$PR_NUMBER" --merge --match-head-commit "$FINAL_HEAD"
```

If merge fails or PR is not mergeable, stop and report the error. Do not change merge strategy or force a merge without user approval. Report the resulting merge status.

## Cleanup

Do NOT remove the worktree. User handles cleanup; follow `git-orca-worktrees` for correct removal command by worktree type.

## Additional Work

After creating the PR, keep this Pi session working in `WORKTREE_PATH`. If the user gives follow-up work in this session, update the Step 0.5 contract for it, then delegate it (Step 1, resuming `BUILD_AGENT_SESSION_ID`) in the same worktree and branch; do not make the change yourself, and do not return to or switch branches in the primary checkout. After each follow-up task, re-perform Steps 2 through 6 (including 3.5 and 4's PR update) before completing.

## Error Cases

- **No remote**: `push-pr.sh` outputs `NO_REMOTE` — stop, worktree remains
- **Push auth/permission failure**: Stop and ask user to resolve (e.g. `gh auth login`). Do NOT try SSH, HTTPS, or remote URL changes.
- **Branch already exists**: `setup.sh` appends `-v2`, `-v3`, etc.
- **Worktree creation fails**: Report error and stop
- **Orca unavailable or repo unregistered**: shared `git-orca-worktrees/setup.sh` falls back to `git worktree add`; cleanup follows `git-orca-worktrees`.
- **Push fails**: Report error (likely need rebase)
- **Merge conflict**: Step 5.5 handles rebase + force push
- **Max CI retries (5)**: Report all accumulated failures and stop
- **Review cap reached with blockers**: status `BLOCKED`; draft PR only; report the open findings
- **Design not ready** (`[TODO:` markers or no `APPROVE`): stop before Step 1 and ask the user
- **Verify or acceptance cannot run**: status `BLOCKED`; report the exact error; never report it as passed

## Reporting

At the end, always report:

- Status: `READY`, `BLOCKED` (with what is missing), or `IN_PROGRESS`
- Branch name and worktree path
- PR URL (and whether it is a draft)
- CI status (passed/failed)
- Requirements table from the final requirements review
- What was not verified
- If failed: which jobs failed and a summary of attempts made

