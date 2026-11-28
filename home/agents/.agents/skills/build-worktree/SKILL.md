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

Orchestrate one task through an isolated worktree, a draft PR, independent review, and local-ci until the PR is `READY`. Scripts live in `S=~/.agents/skills/build-worktree`. Designs follow [Common design rules](../design/common-rules.md); tests follow [Verification strategy](../verification-strategy/SKILL.md).

## Rules

1. **Orchestrate; never edit.** Delegated agents make every change, so reviewers always judge someone else's work. You run read-only commands, the scripts, verification, and commits. Read only what the Contract needs and leave code exploration to the worker. Answer routine subagent notifications in one line.
2. **Evidence is an `EXIT=` line.** Every pass claim quotes `validate.sh`'s `EXIT=0` on the current `HEAD`; missing evidence means not done. Never waive a failure as flaky, environmental, OOM, or unrelated: stop only processes you started, re-run once, then set `BLOCKED` with the exact error.
3. **Scope is locked to the Contract.** Fix only what the Contract requires, what the diff caused, or what its verification needs; everything else is a follow-up note. A fix that would change the Contract's scope, requirements, manifest cases, acceptance, or protected paths goes to the user, and an approved change restarts Step 1.
4. **Gates stay strict.** No agent weakens a protected path (removes cases, adds skips, loosens assertions or thresholds, edits expected values to match new output) unless the task names that change. Adding cases and regenerating generated files is fine.
5. **One worktree, one PR.** Fix in place. The only other worktrees are reviewers' disposable copies and [`fix-broken-base.md`](fix-broken-base.md)'s. Leave the worktree for the user to remove.
6. **Push auth failure: stop and ask** the user to fix it (e.g. `gh auth login`). Leave SSH, HTTPS, credential helpers, and remote URLs alone.
7. After compaction or a long pause, re-read this file and `CONTRACT_FILE` and fetch `BASE_BRANCH` before the next step.

## Status

- `IN_PROGRESS`: work or review ongoing. Any new commit returns here, except the tick commit (Step 5).
- `READY`: on a clean `HEAD`, every reviewer passed (or the owner deferred each blocking finding), Step 3 printed `EXIT=0` for `VERIFY_COMMAND`, and acceptance passed or the requirements reviewer confirmed it not applicable.
- `BLOCKED`: a cap was hit, a check can't run, or a precondition failed. Draft PR only; never merged.

If the design names an owner approval point, merged PRs report "awaiting owner acceptance" until the owner runs the Owner Acceptance Script.

## Agents

Use Pi's `subagent` tool with `cwd: WORKTREE_PATH`. Each task states the goal, authority (edit or review-only; never commit or push), `CONTRACT_FILE`, what done looks like, and the report (changed files, commands with `EXIT=` lines, failures, not verified). One writer per worktree.

- **Worker**: `worker`, or the user's choice. Record `WORKER_RUN_ID`; every fix resumes it.
- **Reviewers**: `build-reviewer` (shell, stronger model, can't edit), not the built-in `reviewer`, which can't run commands. If `build-reviewer` is missing, use `oracle` with `context: "fresh"` and `model: "openai-codex/gpt-5.6-luna:xhigh"`, paste `build-reviewer`'s rules, and say so in the report. Record `CODE_QUALITY_RUN_ID` and `REQUIREMENTS_RUN_ID`.
- **Run IDs**: continue with `subagent({ action: "resume", id, message })`, which returns a new ID to store. `status` checks a run; `steer` works only while it runs. Never pass session IDs or invented model names. After two resumes, or a rejected resume, launch a fresh child with the task, `CONTRACT_FILE`, and the last report; a fresh reviewer keeps the current `REVIEW_ROUND`.
- The tool takes one `subagent` call per turn: launch parallel agents in consecutive turns, then wait for all.
- A "repeated tool failures" notice is usually intended non-zero exits: check `status` once. A provider error (quota, billing) is `BLOCKED`: ask the user which model.

## Step 0: Setup

1. Branch `<type>/<slug>`: a conventional-commit type (`feat` by default, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, …) and a slug of at most 50 characters. Run `bash ~/.agents/skills/git-orca-worktrees/setup.sh "<branch>"` and keep `BRANCH_NAME`, `BASE_BRANCH` (if empty: `git symbolic-ref refs/remotes/origin/HEAD --short`), `WORKTREE_PATH`, and `WORKTREE_ID`.
2. The worktree starts from the remote base. If `git -C "$WORKTREE_PATH" log --oneline "$BASE_BRANCH..<local base branch>"` lists commits, or a design doc the task names is missing, ask the user (they push the base, or you rebase the empty branch onto it).

## Step 1: Contract

The **Contract** is what the reviewers enforce. Read the worktree's `AGENTS.md`, README, and linked designs, then write it to `CONTRACT_FILE="$(git -C "$WORKTREE_PATH" rev-parse --absolute-git-dir)/build-worktree/contract.md"` (inside the git dir, so the tree stays clean). Agents get its path, never retyped values. Append run IDs, round verdicts, and owner decisions as they happen.

- `TASK_DESCRIPTION` (the user's full text), `BASE_BRANCH`, `EXPECTED_BRANCH` (= `BRANCH_NAME`).
- `DESIGN_DOCS`, `DESIGN_SCOPE`, `REQUIREMENT_IDS`, `MANIFEST_CASES`: verbatim from a design that passes readiness; without a design, each ask as `TASK#1`, `TASK#2`, …. A build covers one work unit: if the task names none, ask; if several, build the first, then start a new build on top of it.
- `VERIFY_COMMAND`: the fast check `AGENTS.md` defines (e.g. `pnpm verify`), minus slow checks it leaves to CI. If there is none, assemble one from `.github/workflows/` and `package.json` scripts, and report the gap.
- `ACCEPTANCE_PROCEDURE`: an end-to-end check in the user's real environment, from the design's Owner Acceptance Script or `AGENTS.md`; or "not applicable: <reason>" when nothing user-visible or integration-facing changes. If it needs a browser, probe for one now (`command -v agent-browser && agent-browser --version`, or the repo's browser test command). If it uses a logged-in service, record one read-only command per service as `CREDENTIAL_PROBES` (e.g. `gcloud projects describe <project>`) and run them before each round that runs acceptance. A failed probe is `BLOCKED`.
- CI workflow changes are proven only by a GitHub run on `EXPECTED_HEAD` (`gh run list --commit <sha> --json conclusion,headSha`). A workflow that skips pull requests (local-ci repos often run cloud CI only on `main`) must be started on the branch: `gh workflow run <file> --ref "$BRANCH_NAME"` (needs a `workflow_dispatch` trigger). `local-ci.yml` changes are proven by Step 6.
- `PROTECTED_PATHS`: single-quoted pathspecs from the design and `AGENTS.md` (e.g. `':(glob)**/*.test.ts'`), so deleted files still match.

Docs-only changes (Markdown outside protected paths) need no `VERIFY_COMMAND`, get only the requirements reviewer, and skip absence checks and servers.

Before implementation:

1. **local-ci.** Read the `local-ci` skill and run `bash $S/local-ci-status.sh "$WORKTREE_PATH"`. Done when `SETUP` is empty. `deps`: run the repo's install command. `config`, `dev-dependency`, or `global`: ask the user. On no, `BLOCKED`. On yes, add `TASK#local-ci`; in Step 2 the worker sets it up in its own commit, `ci: run PR checks with local-ci`:
   - `config`: write `local-ci.yml` with one Check per command in `.github/workflows/` PR workflows (or the parts of `VERIFY_COMMAND` if none).
   - `dev-dependency`: pin the latest tag (`git ls-remote --tags --refs https://github.com/tianhuil/local-ci | sort -t/ -k3 -V | tail -1`), e.g. `pnpm add -D github:tianhuil/local-ci#<tag>`.
   - `global` (no `package.json`): run `npm install -g github:tianhuil/local-ci#<tag>` yourself; it touches no project file.
2. **Base check.** Run `VERIFY_COMMAND` through `validate.sh` on the untouched worktree. A non-zero `EXIT=` means a broken base: follow [`fix-broken-base.md`](fix-broken-base.md).

## Step 2: Implement

Launch the worker with `CONTRACT_FILE` and these rules:

- Implement the Contract. Leave design checkboxes and the call that it's done to the reviewers.
- Write tests per `verification-strategy`. Handle the error paths the Contract names; for any other tool failure, surface the tool's own error instead of adding a handler.
- Keep protected paths strict (Rule 4); report a check that looks wrong rather than changing it.
- Run checks with `bash $S/validate.sh "$WORKTREE_PATH" "<cmd>"` and quote each `EXIT=` line. Run commands expected to fail as `<cmd>; echo "rc=$?"`.
- Stop only processes you started, by PID. Don't commit.

Commit what it reports (this is how every worker commit is made), then open the draft PR (body per Step 5, `Status: IN_PROGRESS`) and record `PR_NUMBER`. Push every later commit.

```bash
cd "$WORKTREE_PATH" && git add -- <reported files> && git status --porcelain   # leftovers: ask the worker
git commit -m "<type>: <message>"
PR_DRAFT=1 bash $S/push-pr.sh "$BRANCH_NAME" "$TITLE" "$BODY"   # NO_REMOTE: report and stop
```

## Step 3: Validate

```bash
VERIFY_HEAD="$(git -C "$WORKTREE_PATH" rev-parse HEAD)"
bash $S/validate.sh "$WORKTREE_PATH" "$VERIFY_COMMAND"
git -C "$WORKTREE_PATH" status --porcelain   # any output is a failure
```

`VERIFY_HEAD` plus the `EXIT= LOG= CMD=` lines form `VERIFY_RESULT`, the reviewers' verify evidence. Every new commit needs a new run. On failure, resume the worker with the output, commit its fix, and re-run, up to 3 times; then `BLOCKED`, update the PR (Step 5), and report.

## Step 4: Review

Run this unless the user says to skip it; the status then stays `IN_PROGRESS`. If `git diff --shortstat "$BASE_BRANCH"...HEAD -- . ':!*lock*'` shows more than about 1,000 changed lines (generated files aside), ask the owner whether to split first.

Each round, dispatch both reviewers (`prompts/` is under `$S`):

| Reviewer | Runs | Run ID | Prompt |
| --- | --- | --- | --- |
| Code quality | targeted tests at most | `CODE_QUALITY_RUN_ID` | `prompts/review-code-quality.md` |
| Requirements | commands, acceptance, servers | `REQUIREMENTS_RUN_ID` | `prompts/review-requirements.md` |

Pass the prompt's absolute path (tasks are capped at 16 KB), `CONTRACT_FILE`, and this round's `EXPECTED_HEAD`, `REVIEW_ROUND`, `VERIFY_RESULT` (whose HEAD must equal `EXPECTED_HEAD`), and on re-review the previous reviewed `HEAD` and reports. Round 1 launches; later rounds resume. The worktree is frozen until every reviewer this round has reported.

**Rounds** shrink the target so the loop converges; [`prompts/review-rules.md`](prompts/review-rules.md) defines each:

1. `first`: full review.
2. `re-review`: whole diff, but new findings block only when severe and inside the fix diff.
3. `narrow re-review` (round 3 on): fix diff only.
4. `final full review`: once both pass after more than one round, a fresh pair (new launches) reviews the final `HEAD`, blocking only on Critical findings and the requirements reviewer's hard conditions. It runs once per Contract; if it fails, the fix gets a `re-review` from the same pair. Skip it when round 1 passed.

**Between rounds:**

- **Questions for the owner**: decide the clear ones yourself (usually `rejected` or `best-effort`) and ask the user the rest. The worker records each decision as an edge-case label in the design; list yours in the PR.
- **Fix**: resume the worker with each in-scope finding verbatim and what "fixed" means, plus: "Prefer narrowing or deleting a check over adding one. Run only the focused tests." Commit, run Step 3, then the next round. The round, not the worker, decides whether a finding is fixed.
- **Not converging**: if one file produced blocking findings two rounds running, or the blocking count didn't fall, ask the owner instead of fixing: simplify or cut that code, defer findings, or one more round.
- **Cap**: 3 rounds unless the user sets one; the count carries across re-entries from Step 6. Reaching it with any FAIL or UNVERIFIED is `BLOCKED`. Report each round's blocking findings in one line, and each test that failed more than once with a suggestion (relabel `rejected`/`best-effort`, split it, or let the owner decide). Offer: raise the cap, stop, or defer.
- **Defer** only review findings the owner names explicitly; "just get it merged" names none. A failing verify, acceptance step, CI Check, or protected-path change can't be deferred. Record deferrals in `CONTRACT_FILE` and the PR.

## Step 5: Readiness and PR

Set status from evidence (see Status), never from an agent's summary. When `READY`, record `READY_HEAD`, then have a fresh worker (not a resume) tick, in one commit, each design `- [ ]` the final requirements review marked MET. OWNER items stay unticked; list them in the PR. Accept the commit only if:

```bash
git -C "$WORKTREE_PATH" diff --name-only "$READY_HEAD" HEAD   # only DESIGN_DOCS
git -C "$WORKTREE_PATH" diff -U0 "$READY_HEAD" HEAD            # only "- [ ]" -> "- [x]" on MET IDs
```

Record `FINAL_HEAD`: the only commit that may merge.

Whenever status or `HEAD` changes, push and update the PR; it stays a draft unless `READY`:

```bash
git -C "$WORKTREE_PATH" push
PR_NUMBER="$(gh pr view "$BRANCH_NAME" --json number --jq .number)"
gh pr edit "$PR_NUMBER" --body "$BODY"
gh pr ready "$PR_NUMBER"          # READY
gh pr ready "$PR_NUMBER" --undo   # otherwise
```

Body, with tables copied from the final reviews:

```markdown
**Status:** READY @ <FINAL_HEAD> | BLOCKED (<what is missing>) | IN_PROGRESS

## Summary
<what changed and why; design doc link>

## Requirements
| ID | Evidence | Status |
|----|----------|--------|

## Verification
- `<VERIFY_COMMAND>` → <EXIT= line>
- Acceptance → <each step and result, or "not applicable: <reason>">

## For the owner to check
## Edge cases decided without the owner
## Follow-up notes
## Deferred by the owner
## Not verified
```

Write "None." under empty sections.

## Step 6: CI

```bash
cd "$WORKTREE_PATH" && bash $S/run-local-ci.sh "$PR_NUMBER" "$(git rev-parse HEAD)"
```

This output is the CI evidence; `gh pr checks` passes even when local-ci never ran.

- `MERGE_CONFLICT=true`: resume the worker to rebase with the `resolve-merge-conflict` skill. Conflicts in designs, `AGENTS.md`, or protected paths mean the Contract changed: `BLOCKED`; ask the user.

  ```bash
  cd "$WORKTREE_PATH" && git fetch origin "${BASE_BRANCH#origin/}" && git rebase "$BASE_BRANCH"   # worker runs this
  gh pr ready "$PR_NUMBER" --undo && gh pr edit "$PR_NUMBER" --body "<body with Status: IN_PROGRESS>"
  git push --force-with-lease origin "$BRANCH_NAME"
  ```
- `CONCLUSION=failure`: read `<LOCAL_CI_LOGS>/<check>.log` and re-run the failed Check once. If it passes, note the flake. If it fails the same way on `BASE_BRANCH`, follow [`fix-broken-base.md`](fix-broken-base.md). Otherwise resume the worker with the logs to fix this branch's failure, and commit. At most 5 iterations.
- `CONCLUSION=success`: Step 7 if the user asked to merge and status is `READY`; otherwise report.
- `ERROR:`: local-ci didn't start; report.

A rebase or fix is a new `HEAD`: status returns to `IN_PROGRESS` (mark the PR draft), and Steps 3–5 run again (one review round usually suffices) before Step 6.

## Step 7: Merge (explicit request only)

Merge only when status is `READY`, the PR head is `FINAL_HEAD` and not a draft, CI passed on `FINAL_HEAD`, and the PR is mergeable. A standing instruction such as "merge automatically" doesn't override these.

```bash
gh pr merge "$PR_NUMBER" --merge --match-head-commit "$FINAL_HEAD"
```

If it fails, report; change strategy or force only with the user's approval.

## Follow-up work

Stay in `WORKTREE_PATH`: update the Contract, resume the worker, and rerun Steps 3–6.

## Reporting

Plain language, answer first: can it merge, and what must the user decide. Omit run IDs, round labels, and internal paths unless asked. The final report gives status (and what's missing), branch and worktree, PR URL and draft state, CI result, the requirements table, failed jobs and attempts, cap details (Step 4), owner-deferred findings, any fix-base PR, and Not verified.
