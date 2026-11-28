# Fix a broken base

Use when `VERIFY_COMMAND` fails on the untouched base (Step 1), or a CI Check fails the same way on `BASE_BRANCH` (Step 6; that Check's command is the failing command). A broken base fails every round, so settle it first: a **simple** failure gets its own PR, merged before the task continues. Make one attempt; any step that misses its "Done when" goes to [Ask the user](#ask-the-user).

1. **Classify.** Re-run once; a pass means flaky. Check CI on the base commit (`gh run list --commit "$(git -C "$WORKTREE_PATH" rev-parse "$BASE_BRANCH")" --json name,conclusion,headSha`); a pass of the same command there means local-only. Done when: it failed twice locally and CI didn't pass it.
2. **Fix.** Run `bash ~/.agents/skills/git-orca-worktrees/setup.sh "fix/broken-base-<slug>"` and keep its branch and path as `FIX_BRANCH` and `FIX_PATH`. Launch a new `worker` (`model: "openai-codex/gpt-5.6-luna:medium"`, `cwd: FIX_PATH`) with the failing `EXIT=` line, the log tail, and `PROTECTED_PATHS`: fix the root cause in at most 20 changed lines across 2 files, keep every check, test, timeout, and threshold as strict as it is, don't commit, and if that isn't enough, change nothing and say so. Commit its files, then check:

   ```bash
   git -C "$FIX_PATH" diff --numstat "$BASE_BRANCH"...HEAD   # ≤ 2 files, ≤ 20 lines
   eval "git -C \"\$FIX_PATH\" diff --name-only \"\$BASE_BRANCH\"...HEAD -- $PROTECTED_PATHS '.github/workflows'"   # empty
   git -C "$FIX_PATH" diff "$BASE_BRANCH"...HEAD | grep -nE '^\+.*(\.skip|\.todo|test\.fails|continue-on-error|\|\| true|timeout|threshold|tolerance|retries)'   # empty
   ```

   Done when: all three pass and `validate.sh` prints `EXIT=0` for `VERIFY_COMMAND` in `FIX_PATH`.
3. **Review and merge.** A fresh `build-reviewer` in `FIX_PATH` checks the checkout, reads the diff, applies the Gates step of `prompts/review-requirements.md`, and judges whether the diff fixes the cause rather than hiding it (PASS or FAIL, citing `file:line`). Push with `push-pr.sh`, not as a draft; the body gives the command, the cause, the verdict, and the `EXIT=0` line. Run `run-local-ci.sh` from `FIX_PATH`, and merge only on `CONCLUSION=success`:

   ```bash
   gh pr merge "$FIX_PR_NUMBER" --merge --match-head-commit "$(git -C "$FIX_PATH" rev-parse HEAD)"
   ```
4. **Continue.** Bring the task worktree onto the new base. From Step 1 it has no commits, so this fast-forwards; from Step 6, use Step 6's rebase instead:

   ```bash
   git -C "$WORKTREE_PATH" fetch origin "${BASE_BRANCH#origin/}" && git -C "$WORKTREE_PATH" merge --ff-only "$BASE_BRANCH"
   ```

   Done when the failing command prints `EXIT=0` in `WORKTREE_PATH`. Return to the calling step and list the fix PR in the final report.

## Ask the user

Give the failing command, its `EXIT=` line and log tail, the base CI result, and why it wasn't fixed automatically (flaky, local-only, too large, needs a looser check, review FAIL, CI failure, or merge refused), with any fix PR URL. Wait for their decision before implementing.
