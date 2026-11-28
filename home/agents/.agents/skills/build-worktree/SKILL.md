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

Design documents follow [Common design rules](../design/common-rules.md). Apply that skill instead of repeating its writing, checklist, acceptance, protected-path, and readiness rules here.

Tests and PR evidence follow [Verification strategy](../verification-strategy/SKILL.md).

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
| `local-ci-status.sh "<worktree>"`         | 0.5  | Check that local-ci can run. Outputs `LOCAL_CI` (command, such as `pnpm exec local-ci`; empty if missing) and `SETUP` (what is missing, empty when ready) |
| `validate.sh "<worktree>" <cmd...>`        | 2    | Run validation commands in worktree with `pipefail`. Prints `EXIT=<code> LOG=<path> CMD=<cmd>` per command and the log tail on failure. Exits 0 only if all pass |
| `push-pr.sh "<branch>" "<title>" "<body>"` | 1    | Push branch + create PR (`PR_DRAFT=1` for a draft). Outputs PR URL and `PR_NUMBER`                                                                     |
| `run-local-ci.sh "<pr_number>" "<sha>"`     | 5    | Run from the worktree. Run local-ci on `HEAD`, check mergeability. Outputs `CONCLUSION`, `LOCAL_CI_LOGS`, `MERGEABLE`, `MERGE_CONFLICT` |
| `gh pr merge`                               | 7    | Merge PR only when explicitly requested                                                          |


## Constraints

1. **Do not merge by default.** Merge only when the user explicitly requests merging as part of this task, and only when the build status is `READY` (Step 3.5). Otherwise stop after CI passes and report the result. The one exception is the broken-base fix PR in [`fix-broken-base.md`](fix-broken-base.md), which merges under that file's rules.
2. **Stay on the worktree you created in Step 0.** Never create additional branches or worktrees, except the disposable detached worktrees reviewers create and remove for absence checks, and the broken-base fix worktree in [`fix-broken-base.md`](fix-broken-base.md). Fix issues in place.
3. **Fail closed.** Missing evidence means not done. Never waive a failing check as "environmental", "flaky", "known OOM", or "unrelated". Clean up only processes you started, re-run once, and if it still fails, set status `BLOCKED` and escalate to the user.
4. **Workers preserve checklist integrity.** They do not weaken protected paths by removing cases, adding skips, loosening assertions or thresholds, or editing expected values to match new output unless the task names that change. Reviewers decide; the separate readiness commit records the result. Apply checklist-ticking rules from [Common design rules](../design/common-rules.md).
5. **Scope is locked.** Fix only findings required by the captured task contract, caused by the diff, or required to make its declared verification pass. Treat pre-existing defects, adjacent improvements, cleanup, reviewer preferences, and new requirements as follow-up notes; do not change them in this PR. If a fix would alter `DESIGN_SCOPE`, `REQUIREMENT_IDS`, `MANIFEST_CASES`, `ACCEPTANCE_PROCEDURE`, or `PROTECTED_PATHS`, stop and ask the user rather than expanding scope. A user-approved scope change starts a new contract capture and review cycle.
6. **The orchestrator does not edit project files.** Every change to the worktree is made by a delegated agent, so the reviewers always review someone else's work. The orchestrator may run read-only commands, the helper scripts, and verification commands.
7. **The orchestrator stays lean.** It reads what the contract needs (`AGENTS.md`, README, the design docs) and leaves exploring the code to the worker. After a worker reports, it checks `git status --porcelain` against the reported files and the locked scope, then commits; Step 2 and the reviewers verify the worker's claims. On a routine subagent notification, it replies in one line (what finished, what runs next) and saves the full report for Reporting or a user question.

## Execution Model

This is an **orchestrator** — it coordinates bash scripts and delegated agents. Use Pi's `subagent` tool for AI steps (1, 2, 3, 6), and always pass `WORKTREE_PATH` explicitly as `cwd`. Use the helper scripts for mechanical steps (0, 2, 4, 5). The default implementation agent is `worker`; use a user-specified agent type when provided.

Reviewers must be able to run shell commands (they execute verification and acceptance steps), and should use a stronger model tier than the worker. A reviewer on the same cheap model as the worker tends to approve the worker's blind spots. Use the user's model choice when given.

Use the `build-reviewer` agent for both reviewers. It has shell access, pins a stronger model, and may not edit the checkout. Do **not** use the built-in `reviewer` agent: it has no shell and is told not to run commands, so it cannot execute the verification this skill requires. If `build-reviewer` is unavailable (`subagent({ action: "list" })`; it is installed from the user's dotfiles), use `oracle` with `context: "fresh"` and `model: "openai-codex/gpt-5.6-luna:xhigh"` (effort goes in the model name; the tool has no `effort` option), paste the rules from the `build-reviewer` agent into the task, state review-only authority, and say so in the final report.

Keep the host responsive: only the requirements reviewer runs commands that build, test, or start servers. The code-quality reviewer reads code and diffs only; it does not run tests, because both reviewers share one worktree and its build output.

**Docs-only changes.** When the diff touches only Markdown files outside the protected paths, use one requirements reviewer and no code-quality reviewer, skip the absence check and dev servers, and use read-only commands (`grep`, `git diff`) as evidence. `VERIFY_COMMAND` is not required.

### Build status

Track one status for the task and report it everywhere:

- `IN_PROGRESS`: work or review is ongoing, or review has not run.
- `READY`: on the current `HEAD` with a clean working tree, the reviewers and the final full review returned PASS (the final full review blocks only on Critical findings; Step 3, item 7), Step 2's `validate.sh` run printed `EXIT=0` for `VERIFY_COMMAND` on that `HEAD`, and the acceptance procedure passed, or it is not applicable with a stated reason that the requirements reviewer confirmed from the diff (no user-visible or integration surface changed).
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

3. **Check the base has the task's files.** The worktree starts from the remote base, so commits that exist only on the user's local base branch are missing. If `git -C "$WORKTREE_PATH" log --oneline "$BASE_BRANCH..<local base branch>"` lists commits, or a design doc the task names is absent from `WORKTREE_PATH`, stop and ask the user how to proceed (they push the base, or you rebase the empty branch onto the local commits). Pushing the base branch is the user's call.

## Step 0.5: Preconditions and Contract

Before any implementation, collect the contract the reviewers will enforce. Read the repository's `AGENTS.md` and README in the worktree, and every design doc linked by the task.

1. **Design contract.** Apply [Common design rules](../design/common-rules.md). For each design the task implements, verify readiness before implementation. Capture `DESIGN_SCOPE`, `REQUIREMENT_IDS`, and `MANIFEST_CASES` verbatim from the design; for a task without a design, capture each ask verbatim as `TASK#1`, `TASK#2`, and so on. If the task links a design but does not name an existing work unit, stop and ask the user.
2. **local-ci.** PR checks run only on this machine with local-ci; read the `local-ci` skill. Run `bash ~/.agents/skills/build-worktree/local-ci-status.sh "$WORKTREE_PATH"`. Done when `SETUP` is empty and `LOCAL_CI` is set. For each word in `SETUP`:
   - `deps`: local-ci is declared but not installed; run the repository's install command.
   - `config`, `dev-dependency`, `global`: stop and ask the user before setting up local-ci, naming what is missing. On no, set status `BLOCKED` and stop: work does not start without local-ci. On yes, add `TASK#local-ci` to the contract and, after the base check (item 6), have the worker (record `WORKER_RUN_ID`; Step 1 resumes it) do the project-file parts in one commit, `ci: run PR checks with local-ci`:
     - `config`: write `local-ci.yml` with one Check per command the PR workflows in `.github/workflows/` run (or the parts of `VERIFY_COMMAND`, when there are none).
     - `dev-dependency`: install local-ci pinned to the latest tag (`git ls-remote --tags --refs https://github.com/tianhuil/local-ci | sort -t/ -k3 -V | tail -1`), for example `pnpm add -D github:tianhuil/local-ci#<tag>`.
     - `global` (no `package.json`): run `npm install -g github:tianhuil/local-ci#<tag>` yourself; it touches no project file.
3. **Verify command.** Use the single verify command the repository's `AGENTS.md` defines (for example `pnpm verify`). If none is defined, derive the command list from CI (Step 2) and say in the final report that the repository lacks one. `VERIFY_COMMAND` is the fast loop run on every commit: when `AGENTS.md` leaves slow checks (for example e2e) to PR CI, leave them out; Step 5 runs them once, at the end.
4. **Acceptance procedure.** From the design's Owner Acceptance Script and Acceptance Environment, or the repository's `AGENTS.md`, record how to check the change end to end in the environment the user actually uses (real URLs, real browser). For changes with no user-visible or integration surface, record "not applicable" and why; the requirements reviewer must confirm that from the diff. If the procedure needs a browser, probe for it in the worktree now (for example `command -v agent-browser && agent-browser --version`, or the repository's browser test command). If the probe fails, set status `BLOCKED` ("owner acceptance required: no browser tool") now rather than spending review rounds.

   Changes to CI workflow files can only be proven by a CI run on GitHub. The requirements reviewer cites the run for `EXPECTED_HEAD` (`gh run list --commit <sha> --json conclusion,headSha`) as executed evidence. A workflow whose trigger excludes pull requests (repos using local-ci often run cloud CI only on `main`) never runs on the draft PR, so start it on the branch with `gh workflow run <file> --ref "$BRANCH_NAME"` (needs a `workflow_dispatch` trigger). Changes to `local-ci.yml` are proven by Step 5's run.
5. **Protected paths.** Record paths named by the design and `AGENTS.md` as single-quoted git pathspecs (for example `':(glob)**/*.test.ts' 'scripts/verify.ts'`) so deleted files still match. Apply their protection rules from [Common design rules](../design/common-rules.md).
6. **Base check.** Run `VERIFY_COMMAND` with Step 2's `validate.sh` in `WORKTREE_PATH`, which still equals `BASE_BRANCH`. If it prints a non-zero `EXIT=`, the base is broken: read [`fix-broken-base.md`](fix-broken-base.md) and follow it before any implementation.

Write these items once to the **contract file**, `CONTRACT_FILE="$(git -C "$WORKTREE_PATH" rev-parse --absolute-git-dir)/build-worktree/contract.md"` (inside the git dir, so it never dirties the tree; `mkdir -p` its folder first), as `DESIGN_DOCS`, `DESIGN_SCOPE`, `REQUIREMENT_IDS`, `MANIFEST_CASES`, `VERIFY_COMMAND`, `ACCEPTANCE_PROCEDURE`, `PROTECTED_PATHS`, `BASE_BRANCH`, `EXPECTED_BRANCH`, and the user's full task text as `TASK_DESCRIPTION`. Give every worker and reviewer its path instead of retyping the values. Append the latest run ID per role and each round's verdicts to it as they change, so a fresh child or a resumed orchestrator can pick up from it.

## Agent Run IDs

The `subagent` tool identifies a child by the `runId` it returns. It has no session option: never pass `session`, `sessionId`, or generated IDs. Keep the latest run ID for each role:

- `WORKER_RUN_ID`: the Step 1 worker and every later fix agent.
- `CODE_QUALITY_RUN_ID`: the code-quality reviewer.
- `REQUIREMENTS_RUN_ID`: the requirements reviewer.

Start a role with a normal launch (see Delegated agents) and record the `runId` it returns. Continue it with:

```text
subagent({ action: "resume", id: WORKER_RUN_ID, message: "<follow-up task>" })
```

Resume keeps the child's earlier context, agent, model, and tools, and returns a **new** run ID: replace the stored ID with it every time. A resumed run is async; wait for its result before acting on it. A fix agent resumes `WORKER_RUN_ID`.

Long sessions die on compaction. Resume a role at most twice; for its next continuation, or when resume rejects the run, start a fresh child for that role with the full task, `CONTRACT_FILE`, and the previous run's last report as the handoff. Record its run ID and say so in the final report. A fresh reviewer that replaces one mid-loop keeps the `REVIEW_ROUND` the old one would have had (`re-review` with the previous reviewed `HEAD`), so the re-review rule still bounds what blocks; only Step 3's final full review starts a reviewer as a full review.

A "needs attention after repeated tool failures" notice is often a child's intended non-zero exits (absence checks, guard tests). Check `status` once; if the child is progressing, take no further action.

Match the action to the run's state, using only run IDs the tool returned: `status` to check a run, `steer` only while it is still running, `resume` once it has finished. Do not use `command.status`. Never launch with made-up model names to probe the registry; use the models this skill names.

## Step 1: Execute the Task

Spawn a `worker` agent (or a user-specified agent) with Pi's `subagent` tool. Supply a custom prompt containing:

- **Run ID**: record the returned `runId` as `WORKER_RUN_ID`; later fix agents resume it.
- **Working directory**: pass the worktree path explicitly as the delegation tool's `cwd`; **ALWAYS** work in that worktree, not in the main branch / worktree.
- **Task description**: the full task text, links to design docs, and `DESIGN_SCOPE`, `REQUIREMENT_IDS`, `MANIFEST_CASES`, `VERIFY_COMMAND`, and `PROTECTED_PATHS` from Step 0.5.
- **Instructions**: Read AGENTS.md, README, and package.json; implement the task; do NOT commit.
- **Output**: report changed files, validation commands with their actual results, failures, remaining issues, and anything not verified.

The subagent is a small autonomous unit. Its instructions:

1. Implement the task in the worktree.
2. Do not tick design checkboxes and do not declare the task complete; the reviewers decide.
3. Do not weaken protected paths (remove cases, skip, loosen, or edit expected values to match new output) unless the design or the user's task names that change. Adding cases and regenerating generated files are fine. If a protected check looks wrong, report it instead of changing it.
4. Do not waive failing checks. Report them with the exact error.
5. Run validation commands through `~/.agents/skills/build-worktree/validate.sh "$WORKTREE_PATH" "<cmd>"` and quote each command's `EXIT=` line. A pass claim without `EXIT=0` is not evidence; never judge pass from cut-off output.
6. Choose and write tests with the `verification-strategy` skill.
7. Stop only processes you started, by PID; other sessions share the machine.
8. Run a command you expect to fail (an absence check, a guard test) as `<cmd>; echo "rc=$?"`, so the tool call succeeds and the supervisor's watchdog does not flag it; judge the result from `rc=`.

Commit the worker's changes before validation and review, so reviewers see a clean tree at a known commit. Stage the files the worker reported, then confirm nothing else is left:

```bash
cd "$WORKTREE_PATH" && git add -- <reported files> && git status --porcelain
# Unexpected leftovers: ask the worker what they are before committing anything else.
git commit -m "<type>: <descriptive message>"
```

Then open a draft PR, so the work is visible from the first commit (title and body as in Step 4, with `Status: IN_PROGRESS`), and record `PR_NUMBER`. If output contains `NO_REMOTE`, report that no PR is possible and stop.

```bash
cd "$WORKTREE_PATH" && PR_DRAFT=1 bash ~/.agents/skills/build-worktree/push-pr.sh "$BRANCH_NAME" "$TITLE" "$BODY"
```

From here on, push every new commit (`git -C "$WORKTREE_PATH" push`), so the PR always shows `HEAD`. Step 4 updates its body and draft state; Step 5 runs local-ci.

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

Then run the commands in one call and record the commit they ran on:

```bash
VERIFY_HEAD="$(git -C "$WORKTREE_PATH" rev-parse HEAD)"
bash ~/.agents/skills/build-worktree/validate.sh "$WORKTREE_PATH" "$VERIFY_COMMAND"
# or, without a repository verify command:
bash ~/.agents/skills/build-worktree/validate.sh "$WORKTREE_PATH" "npm test" "npm run lint" "npm run typecheck"
git -C "$WORKTREE_PATH" status --porcelain   # must be empty; verify must not change tracked files
```

This run is the verify evidence for `VERIFY_HEAD`: pass `VERIFY_HEAD` and the `EXIT= LOG= CMD=` lines to the requirements reviewer as `VERIFY_RESULT`, and it checks them instead of re-running the command. The orchestrator did not write the code, so its run is independent evidence. Every new commit needs a new run. If `git status --porcelain` prints anything, treat it as a validation failure.

Do not drop a command because it is slow, memory-hungry, or failed for "environmental" reasons. If a failure looks environmental (port in use, out of memory, stale server), stop only processes this task started, re-run once, and if it still fails, set status `BLOCKED` and report the exact error. A skipped command is reported as not verified, never as passed.

Pass and fail come from `validate.sh` exit codes, never from reading output. Every pass claim, by the orchestrator, a worker, or a reviewer, quotes the `EXIT=0` line; read the `LOG=` file when the tail is not enough.

If it exits non-zero, resume `WORKER_RUN_ID` as the fix agent, with the validation output in its follow-up message. Ask it to fix the failures, commit, and report its changes; then re-run. Repeat until all pass **up to 3 times**. If it continues to fail after these attempts to fix it, set status `BLOCKED`, skip Step 3, update the draft PR (Step 4), and explain what went wrong.

## Step 3: Task Review (required)

Always run this step. Skip it only when the user explicitly says to; the status then stays `IN_PROGRESS` (unreviewed), never `READY`.

Resolve all prompt paths relative to this skill's directory—the directory containing this `SKILL.md`—not the repository or worktree root. For example:

```bash
SKILL_DIR="$(dirname "$(realpath ~/.agents/skills/build-worktree/SKILL.md)")"
```

1. Do not paste the prompt files into the task (workflow tasks are capped at 16 KB). Give each reviewer the absolute path of its prompt file below and `CONTRACT_FILE`, and tell it to read and follow both: the contract file supplies `TASK_DESCRIPTION`, `BASE_BRANCH`, `EXPECTED_BRANCH`, and the Step 0.5 values verbatim. In the task, give only the per-round placeholders: `WORKTREE_PATH`, `EXPECTED_HEAD` (`git -C "$WORKTREE_PATH" rev-parse HEAD` after the latest commit), `REVIEW_ROUND` (`first`, `re-review` with the previous reviewed `HEAD`, or `final full review`), `VERIFY_RESULT` (Step 2's run; its `VERIFY_HEAD` must equal `EXPECTED_HEAD`), and the previous round's reports on re-review. Write every file a task cites before dispatching it.
2. Set the review-round cap from the user's request, or use `3`. The count carries across re-entries from Steps 5.5 and 6; it does not reset.
3. Start these reviewers so they run concurrently (only the requirements reviewer for docs-only changes): the tool accepts **one `subagent` call per turn**, so launch or resume each as its own async call in consecutive turns, then wait for both results. Pass `WORKTREE_PATH` as `cwd`, with shell access and a stronger model tier than the worker (see Execution Model):
  
  | Reviewer     | Agent            | Run ID                    | Prompt                           |
  | ------------ | ---------------- | ------------------------- | -------------------------------- |
  | Code quality | `build-reviewer` | `CODE_QUALITY_RUN_ID`     | `"$SKILL_DIR/prompts/review-code-quality.md"` |
  | Requirements | `build-reviewer` | `REQUIREMENTS_RUN_ID`     | `"$SKILL_DIR/prompts/review-requirements.md"` |
  

   Round 1 launches them and records each returned run ID; later rounds resume them (see Agent Run IDs). Keep each run ID paired with its reviewer; never swap them.

   The worktree is frozen at `EXPECTED_HEAD` until every reviewer launched this round has reported: start the fix (item 6) only then, even when one reviewer's FAIL is already in hand. A worker editing under a running reviewer voids that review.
4. On every round, have both reviewers inspect the current diff and report whether prior issues are fixed, plus any new evidence-backed issues. Give them the new `EXPECTED_HEAD` each round; a report against a different commit does not count. In `re-review` rounds the prompts' re-review rule applies: new findings outside the fix diff (`git diff <previous reviewed HEAD>..HEAD`) block only if Critical, and the rest become follow-up notes. Round 1 is the full review; later rounds still report everything but cannot keep adding blockers outside the fix.
5. If either reviewer lists Questions for the owner, decide each one yourself when the answer is reasonably clear from the design, the task, and the reviewer's recommendation (usually `rejected` or `best-effort`). Stop and ask the user only about the unclear ones, offering the recommended label and behavior. Have the worker record each decision in the design as an edge-case label ([Common design rules](../design/common-rules.md)) as part of the next fix, and list the ones you decided, plus each reviewer's Edge cases judged, in the PR body under "Edge cases decided without the owner". Have the worker record the reviewers' judgments in the design too. `rejected` and `best-effort` decisions usually need only that line and a short test or none.
6. If either reviewer finds in-scope issues, resume `WORKER_RUN_ID` with both reports, fix only those issues, and re-run Step 2. During the fix, the worker runs only the focused tests for those findings (for example `vitest run <file> -t "<name>"`), not the full suite or slow checks; Step 2 runs the full verify command afterwards. Then resume `CODE_QUALITY_RUN_ID` and `REQUIREMENTS_RUN_ID` for the next round. Do not accept a fix agent's claim that something is fixed; the next review round checks it. Reviewers must label out-of-scope and non-blocking findings as follow-up notes; they do not trigger edits or another review round.
7. When both reviewers approve after more than one round, run one **final full review** with a fresh requirements reviewer (a new launch, not a resume; record its run ID as `REQUIREMENTS_RUN_ID`) against the final `HEAD`, including the absence check. Resumed reviewers tend to check only their earlier findings; the fresh one reviews the whole change. It blocks only on Critical findings and on the prompt's hard conditions (checkout, requirement rows, verify result, acceptance, protected paths); its FAIL starts another round. Its High and lower findings go in the PR body under Follow-up notes. If round 1 passed, it already was a fresh full review; skip this.
8. Stop when both reviewers and the final full review pass on the same `HEAD`, or when the review-round cap is reached. **Reaching the cap with any FAIL or UNVERIFIED sets status `BLOCKED`.** Do not continue to a ready PR or a merge. Report the hard-to-pass tests instead (see Reporting): for each requirement row or test that failed in more than one round, its name, the rounds it failed, the finding each time, and a suggestion: relabel the case `rejected` or `best-effort`, split the test, or have the owner decide the behavior.

## Step 3.5: Readiness Decision

Set the build status from evidence, not from any agent's summary:

- `READY` only when, on the current `HEAD` with a clean working tree (`git status --porcelain` is empty): both reviewers and the final full review returned PASS; Step 2's `validate.sh` run printed `EXIT=0` for `VERIFY_COMMAND` on that `HEAD`; and the acceptance procedure passed, as recorded step by step in the requirements review (or is not applicable, as confirmed by the requirements reviewer).
- Otherwise `BLOCKED`, with the missing items listed.

When the status is `READY`, record `READY_HEAD="$(git -C "$WORKTREE_PATH" rev-parse HEAD)"`, then delegate to a fresh `worker` (a new launch, not a resume of `WORKER_RUN_ID`) one commit that ticks each design `- [ ]` item the final requirements review marked MET, citing its evidence in the commit message. Items not MET stay unticked, and OWNER items are never ticked by agents: list them in the PR body for the owner. Check that commit mechanically before accepting it:

```bash
git -C "$WORKTREE_PATH" diff --name-only "$READY_HEAD" HEAD   # only files in DESIGN_DOCS
git -C "$WORKTREE_PATH" diff -U0 "$READY_HEAD" HEAD            # only "- [ ]" -> "- [x]" on MET IDs
```

If the commit passes both checks, it keeps `READY`. Anything else, or any other change after `READY`, returns the status to `IN_PROGRESS`. Record `FINAL_HEAD="$(git -C "$WORKTREE_PATH" rev-parse HEAD)"`: this is the only commit that may merge.

## Step 4: Update the PR

The draft PR from Step 1 is the only PR for the branch. Push, then update it to match the current status; it stays a draft unless `READY`, so unfinished work is never mistaken for finished work. Do this every time the status or `HEAD` changes, including after Steps 5.5 and 6:

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

## Edge cases decided without the owner
- <case — label: behavior, or "None.">

## Follow-up notes
- <non-blocking findings from the reviewers and the final full review, or "None.">

## Not verified
- <anything not observed directly, or "Nothing.">
```

## Step 5: Run CI with local-ci

```bash
cd "$WORKTREE_PATH" && bash ~/.agents/skills/build-worktree/run-local-ci.sh "$PR_NUMBER" "$(git rev-parse HEAD)"
```

The local Run is the CI: the script runs local-ci on `HEAD`, which mirrors each Check to GitHub as a `local-ci/<check>` Commit Status and skips Checks already passed on that commit. It can run as long as the slowest Check's timeout in `local-ci.yml`. `gh pr checks` passes even when local-ci never ran, so this output is the CI evidence. Parse output:

- `MERGE_CONFLICT=true` → proceed to Step 5.5
- `CONCLUSION=success` → **CI PASSED**; proceed to Step 7 only if user explicitly requested merging and status is `READY`, otherwise report and stop
- `CONCLUSION=failure` → proceed to Step 6
- `ERROR:` → local-ci did not start (not ready, or `HEAD` moved); report to user

## Step 5.5: Resolve Merge Conflicts

Resume `WORKER_RUN_ID` to rebase and resolve with the **resolve-merge-conflict** skill (the orchestrator does not edit files):

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

This step requires AI to understand failure logs. Read the failure preview in Step 5's output, and `<LOCAL_CI_LOGS>/<check>.log` for each failed Check.

Resume `WORKER_RUN_ID` as the fix agent. Include the failed CI logs and the locked contract in its follow-up message. Ask it to fix only failures caused by this branch or required by the task; pre-existing or adjacent failures become `BLOCKED` follow-up notes, not scope expansion. Ask it to report its changes. Commit the reported files (as in Step 1) and push:

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

After creating the PR, keep this Pi session working in `WORKTREE_PATH`. If the user gives follow-up work in this session, update the Step 0.5 contract for it, then delegate it (Step 1, resuming `WORKER_RUN_ID`) in the same worktree and branch; do not make the change yourself, and do not return to or switch branches in the primary checkout. After each follow-up task, re-perform Steps 2 through 6 (including 3.5 and 4's PR update) before completing.

## Error Cases

- **No remote**: `push-pr.sh` outputs `NO_REMOTE` — stop, worktree remains
- **Push auth/permission failure**: Stop and ask user to resolve (e.g. `gh auth login`). Do NOT try SSH, HTTPS, or remote URL changes.
- **Branch already exists**: `setup.sh` appends `-v2`, `-v3`, etc.
- **Worktree creation fails**: Report error and stop
- **Orca unavailable or repo unregistered**: shared `git-orca-worktrees/setup.sh` falls back to `git worktree add`; cleanup follows `git-orca-worktrees`.
- **Push fails**: Report error (likely need rebase)
- **Merge conflict**: Step 5.5 handles rebase + force push
- **Max CI retries (5)**: Report all accumulated failures and stop
- **Review cap reached with blockers**: status `BLOCKED`; draft PR only; report the open findings and the hard-to-pass tests
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
- If the review cap was reached: the hard-to-pass tests (Step 3, item 8)

