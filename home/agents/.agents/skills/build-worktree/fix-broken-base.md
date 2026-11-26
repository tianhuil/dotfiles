# Fix a broken base

Read this only when the Step 0.5 base check fails: `VERIFY_COMMAND` fails on `BASE_BRANCH` before any implementation. A broken base fails every review round no matter what the task does, so settle it first. A **simple** failure is fixed in its own PR, merged, and the task continues. Anything else goes to the user.

Make one attempt. Any step that does not reach its completion criterion ends the attempt: go to [Ask the user](#ask-the-user).

## 1. Classify the failure

1. Re-run the base check once. If it passes, the failure is flaky, not simple.
2. Check CI on the base commit: `gh run list --commit "$(git -C "$WORKTREE_PATH" rev-parse HEAD)" --json name,conclusion,headSha`. If CI ran the same command there and passed, the failure is local to this machine, not simple.

Done when: the failure reproduced twice locally and CI on the base commit did not pass that command.

## 2. Fix in a separate PR

1. Create a second worktree with `bash ~/.agents/skills/git-orca-worktrees/setup.sh "fix/broken-base-<slug of the failing command>"`. Record its `BRANCH_NAME` and `WORKTREE_PATH` as `FIX_BRANCH` and `FIX_PATH`.
2. Launch a new worker (not `WORKER_RUN_ID`) on the cheaper model:

   ```text
   subagent({
     agent: "worker",
     model: "openai-codex/gpt-5.6-luna:medium",
     cwd: FIX_PATH,
     task: `
       Goal: make VERIFY_COMMAND pass on this branch by fixing the root cause of the failure below.
       Context: <failing EXIT= line and log tail from the base check>; PROTECTED_PATHS.
       Authority: edit files in FIX_PATH; do not commit or push.
       Rules: at most 20 changed lines in at most 2 files. Fix the cause; keep every check, test, timeout, and threshold as strict as it is. If the fix needs more, or needs a check loosened, change nothing and say so.
       Report: changed files, the cause, commands run with their EXIT= lines.
     `
   })
   ```
3. If the worker reports the fix is not simple, stop here. Otherwise commit the reported files (as in Step 1) and check the diff mechanically:

   ```bash
   git -C "$FIX_PATH" diff --numstat "$BASE_BRANCH"...HEAD   # at most 2 files; added + deleted <= 20
   eval "git -C \"\$FIX_PATH\" diff --name-only \"\$BASE_BRANCH\"...HEAD -- $PROTECTED_PATHS '.github/workflows'"   # prints nothing
   git -C "$FIX_PATH" diff "$BASE_BRANCH"...HEAD | grep -nE '^\+.*(\.skip|\.todo|test\.fails|continue-on-error|\|\| true|timeout|threshold|tolerance|retries)'   # prints nothing
   ```
4. Run Step 2's `validate.sh` in `FIX_PATH`.

Done when: the worker made a fix, all three diff checks pass, and `validate.sh` printed `EXIT=0` for `VERIFY_COMMAND` on the fix commit.

## 3. Review, merge, and continue

1. Launch a fresh `build-reviewer` with `cwd: FIX_PATH`. Its task: confirm the checkout is `FIX_BRANCH` at the fix commit and clean; read the full diff; apply the "Gate integrity" step of `"$SKILL_DIR/prompts/review-requirements.md"` with `PROTECTED_PATHS`; judge whether the diff fixes the cause rather than hiding the failure, quoting `file:line`. Verdict PASS or FAIL.
2. Push with `push-pr.sh` (not a draft). In the body, give the failing command, the cause, the reviewer's verdict, and the `EXIT=0` line.
3. Run `run-local-ci.sh` from `FIX_PATH` for the fix commit. Merge only on `CONCLUSION=success`:

   ```bash
   gh pr merge "$FIX_PR_NUMBER" --merge --match-head-commit "$(git -C "$FIX_PATH" rev-parse HEAD)"
   ```
4. Move the task worktree onto the new base; it has no commits yet, so this fast-forwards:

   ```bash
   git -C "$WORKTREE_PATH" fetch origin "${BASE_BRANCH#origin/}" && git -C "$WORKTREE_PATH" merge --ff-only "$BASE_BRANCH"
   ```
5. Re-run the base check in `WORKTREE_PATH`.

Done when: the reviewer returned PASS, CI passed, the PR merged, and the base check printed `EXIT=0`. Continue Step 0.5, and list the fix PR URL in the final report. Leave `FIX_PATH` in place for the user to clean up.

## Ask the user

Stop before any implementation and ask. Give:

- the failing command, its `EXIT=` line, and the log tail;
- the CI result for the base commit;
- why it was not fixed automatically (flaky, local only, too large, needs a check loosened, review FAIL, CI failure, or merge refused), with the fix PR URL if one exists.

Wait for the user's decision. Do not start Step 1 on a broken base.
