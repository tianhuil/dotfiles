# Feature: wt-build / wt-continue Incremental Rebuild

## Executive Summary

`wt-build` orchestrates a full PR lifecycle in an isolated git worktree: setup →
AI implement → validate → push PR → monitor CI → fix failures. The current
implementation (`home/omp/.omp/agent/extensions/wt-build/index.ts`, **1049 lines**)
works end-to-end and has 6 passing integration tests, but it is a single monolith
with three structural problems that block confident iteration:

1. **One injectable seam is missing.** Git/`gh` calls go through an injected
   `exec`, but the **AI turn** is driven by calling `pi.sendMessage` +
   `ctx.waitForIdle` directly inside `phaseImplement`. To make the AI phase
   testable, the *test harness regex-parses the message text* for a backtick-quoted
   worktree path (see `wt-build.test.ts:49-57`). This is the fragile seam the whole
   AI half hangs on.
2. **A fallback hack papers over unreliable AI.** When the AI produces no file
   changes, `phaseImplement` (lines 306-329) regex-parses the task string
   (`"create X with content Y"`) and writes the file itself. This is a symptom, not
   a feature, and it is untested.
3. **Two orchestration paths duplicate the remote half.** `orchestrate` and
   `orchestrateContinue` each re-implement validate-loop → push → monitor-CI →
   CI-loop with near-identical code (compare lines 835-858 vs 920-963).

**Success criteria:** the extension is decomposed into independently-testable
modules; every phase is locked by tests **before** the next phase is built; the
public contract (command names `wt-build` / `wt-continue`, the `--no-gh` flag, and
the `BuildWorktreeState` schema) is preserved so existing sessions keep working;
the AI fallback hack is deleted; no test ever hits real GitHub.

## What to Reuse (Do Not Rewrite)

The rebuild is a **refactor + test-enablement**, not a from-scratch rewrite. These
are already correct and stay:

| Asset | Location | Why it stays |
|---|---|---|
| Phase decomposition | Setup→Implement→Validate→Push→Monitor→Fix | Conceptually right; matches the `build-worktree` skill's `setup.sh`/`validate.sh`/`push-pr.sh`/`monitor-ci.sh` 1:1 |
| `BuildWorktreeState` shape | `index.ts:14-26` | Round-trips through `appendEntry`/`getBranch`; changing it breaks sessions |
| `createExec()` shell wrapper | `index.ts:104-136` | Already normalises `Bun.spawn` into `ExecResult`; shared with `wt-clean` |
| `createHarness()` scripted-AI pattern | `wt-build.test.ts:35-73` | Seed of the new `AiDriver` seam; promote to shared module |
| `yak-shaving-guard` fake-`pi` pattern | `index.test.ts:16-73` | `satisfies Partial<ExtensionAPI>` gives type-safe fakes — adopt for all phase tests |
| `--no-gh` local-only axis | `orchestrate`/`orchestrateContinue` | Lets the local half be locked with zero network |

## Technical Design

### Architecture: three injectable seams

Every phase becomes a pure function of three injected collaborators plus the state
object. This is the 2025 best-practice pattern (separate deterministic
orchestration from LLM behavior; DI for every collaborator so mocks/fakes swap in):

```text
                         ┌─────────────────────────────────────┐
   wt-build command ───▶ │ orchestrate(state, { exec, ai, io })│
                         └──────────────┬──────────────────────┘
                                        │ calls in order
            ┌───────────────┬───────────┼───────────┬───────────────┐
            ▼               ▼           ▼           ▼               ▼
        phaseSetup     phaseImplement  ...     phaseMonitorCI   phaseCILoop
            │               │                   │               │
            └──────┬────────┴────────┬──────────┴───────────────┘
                   ▼                 ▼                 ▼
             exec: ExecFn       ai: AiDriver      io: IoSink
             (shell + gh)       (one LLM turn)    (notify + log)
```

The three seams:

```ts
// exec.ts — shell + gh. Already mostly exists; make it the UNIVERSAL injection.
export type ExecFn = (command: string) => Promise<ExecResult>;

// ai.ts — NEW. Replaces direct pi.sendMessage + ctx.waitForIdle.
//   Production impl wraps them; tests inject a scripted callback.
export type AiDriver = (prompt: string) => Promise<void>;

// io.ts — thin sink so phases don't take the full ctx just to notify.
export interface IoSink {
  notify(msg: string, kind: "info" | "warning" | "error"): void;
  log(msg: string): void;
}
```

**This is the single most important decision.** Once the AI turn is an injected
`AiDriver`, the regex-based test harness and the regex-based fallback hack both
become unnecessary and are deleted. The AI phase becomes as deterministic as the
git phases.

### Module layout

```text
wt-build/
  index.ts                 # entry only: register commands, parse --no-gh, session_start hook
  types.ts                 # BuildWorktreeState, ExecResult, CIResult, ExecFn, AiDriver, IoSink
  exec.ts                  # createExec, wtExec                 (extracted; shared with wt-clean)
  state.ts                 # STATE_TYPE, saveState, recoverState (extracted)
  branch.ts                # slugify, inferBranchPrefix, buildBranchName (extracted, pure)
  ai.ts                    # makeAiDriver(pi, ctx): AiDriver    (production LLM driver)
  io.ts                    # makeIoSink(ctx): IoSink
  orchestrate.ts           # orchestrate, orchestrateContinue, runRemotePipeline (shared)
  phases/
    setup.ts               # phaseSetup
    implement.ts           # phaseImplement, phaseImplementContinue   (fallback DELETED)
    commit.ts              # commitInWorktree
    validate.ts            # discoverValidationCommands, phaseValidate, phaseValidateLoop
    push.ts                # phasePushPR
    monitor-ci.ts          # getRunId, getRunConclusion, getPRMergeState, getFailedJobs,
                           #   getFailedLogs, phaseMonitorCI
    fix-ci.ts              # phaseFixCI, phaseCILoop
  harness/
    test-harness.ts        # createHarness(): { exec, ai, io, scriptedAi, ctx }  (promoted)
    fixtures.ts            # makeRepo(), writeRepoFile(), makeFakeGhExec()
  *.test.ts                # one per module, co-located
```

### Data Model

Unchanged — `BuildWorktreeState` is the persistence contract:

```ts
export interface BuildWorktreeState {
  branch: string;  baseBranch: string;  repoRoot: string;  worktreePath: string;
  prNumber: number | null;  runId: number | null;
  phase: string;  task: string;
  validationIteration: number;  ciIteration: number;  failures: string[];
}
```

`saveState`/`recoverState` move to `state.ts` verbatim. The `session_start`
stale-state warning stays in `index.ts`.

### API Contracts (command surface — FROZEN)

| Command | Args | Behavior |
|---|---|---|
| `/wt-build` | `[--no-gh] <task>` | Full pipeline; `--no-gh` skips push/monitor/fix |
| `/wt-continue` | `[--no-gh] <instructions>` | Recover state, implement follow-up, validate, push to existing PR |

Names, flags, and the state schema are **frozen**. No compat shims because nothing
changes publicly.

## Implementation Plan — phased, each phase LOCKED before the next

"Locked" = `bun test` green **and** `bun typecheck` green for that phase's new
tests + all prior tests. The public extension stays loadable at every commit
because `index.ts` keeps re-exporting during extraction.

### Phase A — Foundations (pure extraction, zero behavior change)
- Extract `types.ts`, `exec.ts`, `state.ts`, `branch.ts`, `io.ts` from the monolith.
- `index.ts` imports them; logic identical.
- **Lock:** original 6 integration tests still pass; no new behavior yet.
- Acceptance: `bun test home/omp/.omp/agent/extensions/wt-build` green, diff is pure moves.

### Phase B — Lock the pure layer
- Unit tests for `branch.ts`: each of the 11 prefix categories, default `feat`,
  slug truncation at 50 chars, unicode/special-char stripping, empty task →
  `untitled`, multi-sentence task uses first sentence only.
- Unit tests for `state.ts`: round-trip, recover-when-empty → null, recover-latest
  when multiple entries interleaved with other custom types.
- **Lock:** pure-fn branches fully covered; integration tests still green.

### Phase C — Universal exec seam + lock git phases with REAL git
- Make `ExecFn` the universal injection; delete the internal `createExec()` call
  inside `phaseImplement` (line 307).
- Extract `phases/setup.ts`, `phases/commit.ts`.
- Tests use real git in `mkdtemp` repos (existing `beforeAll` pattern):
  - setup: worktree created at `<root>/.worktrees/<slug>`; branch name correct;
    collision → `-v2`; no `origin` → falls back to HEAD (the current test repo
    already exercises this).
  - commit: nothing-to-commit returns `staged:false` ok; happy path; commit
    message with embedded `"` is correctly escaped.
- **Lock:** deterministic git tests; no network.

### Phase D — The AI-driver seam (critical refactor)
- Add `ai.ts` (`makeAiDriver`) and the `AiDriver` type.
- `phaseImplement`/`phaseImplementContinue` take `ai: AiDriver` and call
  `await ai(prompt)` instead of `pi.sendMessage`+`waitForIdle`.
- **Delete the regex fallback hack** (lines 306-329). With a contracted `AiDriver`,
  "AI did nothing" is a test/script bug, not something the orchestrator patches.
- Tests inject a scripted `ai` that writes files in the worktree; assert the prompt
  passed to `ai` contains the worktree path and the "do not commit" instruction.
  Assert the fallback regex never executes (it no longer exists).
- **Lock:** AI phase fully deterministic; ~25 lines of hack removed.

### Phase E — Lock validation
- Extract `phases/validate.ts`.
- Fixture repo with `package.json` scripts `{test, lint, notARealScript}`: assert
  only `test`+`lint` discovered and run (the `bun -e` parser already guards this).
- Loop tests with scripted `ai` + real shell: failing `test` → AI fix → re-run →
  pass; and max-iteration exhaustion returns `false` and notifies.
- **Lock:** validate loop deterministic end-to-end without gh.

### Phase F — Lock remote phases with SCRIPTED exec (fake gh, no network)
- Extract `phases/push.ts`, `phases/monitor-ci.ts`, `phases/fix-ci.ts`.
- Inject a fake `ExecFn` (`makeFakeGhExec` in `harness/fixtures.ts`) returning
  canned `gh run list/view`, `gh pr view`, and scripted push results.
- Tests cover every gh code path: push happy path; `NO_REMOTE`; push-auth-403/401
  → `PUSH_AUTH_FAILURE`; CI `success`; CI `failure` → scripted fix → `success`;
  `CONFLICTING`/`DIRTY` → rebase → force-push; max-CI-retries (5); CI `TIMEOUT`.
- **Lock:** 100% of gh branches covered by scripted responses; zero network calls.

### Phase G — Lock orchestration (wiring + de-duplication)
- Extract `orchestrate.ts`. Introduce `runRemotePipeline(exec, ai, io, state, {createPR})`
  holding the shared validate→push→monitor→fix-CI sequence. Both `orchestrate` and
  `orchestrateContinue` call it; `createPR` flag distinguishes `gh pr create` vs
  plain push. This deletes ~40 lines of duplication.
- Integration tests (existing `--no-gh` e2e: build-then-continue,
  continue-without-build, both usage messages) move here and stay green.
- Add one fully-scripted full-pipeline test (fake exec + scripted ai) asserting
  phase ordering and `state.phase` transitions without real git or network.
- **Lock:** orchestration tests green; duplication removed.

### Phase H — Entry point + session resume
- `index.ts` reduced to: `setLabel`, command registration, `--no-gh` parsing,
  `session_start` stale-state warning.
- Tests: registration of both commands; usage messages on empty args; stale-state
  notification fires on `session_start` when `phase !== "done"`.
- **Lock:** entry-point tests green; `index.ts` ≤ ~60 lines.

## Acceptance Criteria

- [ ] `bun test home/omp/.omp/agent/extensions/wt-build` — all phases green.
- [ ] `bun typecheck` green (per repo AGENTS.md).
- [ ] Public contract unchanged: `/wt-build`, `/wt-continue`, `--no-gh`,
      `BuildWorktreeState` schema identical.
- [ ] The regex fallback hack is deleted; no test depends on it.
- [ ] No test makes a real `gh`/network call (all remote paths use scripted exec).
- [ ] The two orchestration paths share one `runRemotePipeline`.
- [ ] Each phase's tests existed and were green before the next phase was started.
- [ ] RPC smoke test from AGENTS.md passes: `wt-build`/`wt-continue` register with
      no `extension_error` frame.

## Boundaries

- ✅ **Always:** run `bun test` + `bun typecheck` after each phase; do not start
  the next phase until the current one is locked; keep `index.ts` re-exporting
  during extraction so the extension stays loadable at every commit; align phase
  module boundaries 1:1 with the `build-worktree` skill scripts for mental-model
  reuse.
- ⚠️ **Ask first:** deleting the fallback hack (changes observable behavior when
  AI stalls); altering the `BuildWorktreeState` schema (breaks in-flight
  sessions); promoting `exec.ts` to a shared module also imported by `wt-clean`.
- 🚫 **Never:** make a real `gh`/GitHub API call from a test; commit `.worktrees/`
  test artifacts (they are already gitignored as `prunable`); rename the commands
  or flags; call `pi.sendMessage`/any runtime action during extension load
  (throws `ExtensionRuntimeNotInitializedError`); widen the test harness to
  re-introduce message-text parsing.

## Testing Strategy (layered, per web-research best practice)

| Layer | What | Seams used | Determinism |
|---|---|---|---|
| **Unit** | `branch.ts`, `state.ts` pure fns | none | fully |
| **Shell** | `exec.ts`, git phases | real shell/git in `mkdtemp` | fully |
| **Component** | AI phase, validate loop | scripted `ai` + real shell | fully |
| **Scripted-remote** | push, monitor-CI, fix-CI | fake `exec` (canned `gh` JSON) | fully |
| **Integration** | orchestration `--no-gh` e2e | real git + scripted `ai` | fully |
| **Full-pipeline sim** | phase ordering | fake `exec` + scripted `ai` | fully |

The validate loop **is** the built-in quality gate (local checks before push);
CI monitoring is the second gate. No LLM-as-judge is needed here because the LLM
is fully abstracted behind `AiDriver` — we test the *orchestration contract*, not
LLM prose, which is exactly the recommended split.

## Open Questions

1. Promote `exec.ts` (+ `parseWorktreeList` from `wt-clean`) into a shared
   `extensions/_shared/exec.ts` now, or keep duplicated until a third consumer
   appears? (Lean: share now — two consumers is enough.)
2. Should `phaseMonitorCI`'s polling constants (10s appearance poll ×30, 30s
   conclusion poll, 5-min timeout) become env-overridable for faster tests, or
   stay hardcoded and rely on the scripted-exec layer to skip real waits?
   (Lean: scripted exec already skips waits; keep hardcoded.)
3. Keep `discoverValidationCommands` limited to `package.json`/bun, or extend to
   `.github/workflows/` + `pyproject.toml` as the skill doc describes? (Out of
   scope for this rebuild; file as a follow-up.)

## References

- OMP extension runtime & full API — `omp://extensions.md`
- OMP extension authoring guide — `omp://skills/authoring-extensions.md`
- Existing implementation — `home/omp/.omp/agent/extensions/wt-build/index.ts`
- Existing tests + harness — `home/omp/.omp/agent/extensions/wt-build/wt-build.test.ts`
- Sibling test-pattern reference — `home/omp/.omp/agent/extensions/yak-shaving-guard/index.test.ts`
- Phase-boundary reference (bash scripts) — `skill://build-worktree`
- Repo validation convention — `AGENTS.md` (`bun typecheck`; RPC smoke test)
- [Addy Osmani: How to write a good spec for AI agents](https://addyo.substack.com/p/how-to-write-a-good-spec-for-ai-agents)
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
