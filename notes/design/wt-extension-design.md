# Feature: Unified `wt` Extension (build / continue / clean)

## Executive Summary

Three separate worktree extensions — `wt-build` (1049 lines), `wt-continue`
(inside `wt-build`), and `wt-clean` (220 lines, **zero tests**) — collapse into
one `wt` package exposing three commands: `/wt-build`, `/wt-continue`, `/wt-clean`.
Command names and flags are **frozen** (no invocation change); the rebuild is
internal: decompose the monolith into testable modules, merge `wt-clean` in, share
the git/exec helpers both extensions currently duplicate, and lock every phase
with tests **before** moving forward.

Three structural problems motivate the rebuild:

1. **No AI test seam.** Git/`gh` calls are injectable via `exec`, but the AI turn
   calls `pi.sendMessage`+`ctx.waitForIdle` directly. The test harness
   **regex-parses message text** for a backtick-quoted worktree path
   (`wt-build.test.ts:49-57`) to fake the AI — the fragile seam the whole AI half
   hangs on.
2. **Fallback hack** (`wt-build/index.ts:306-329`): when AI stalls, it regex-parses
   `"create X with content Y"` and writes the file itself. Untested symptom-code.
3. **Duplication across the board.** `wt-clean` copy-pastes `createExec` from
   `wt-build` (with a latent bug — `?? 0` vs the correct `?? 1`); both re-implement
   base-branch detection (`git symbolic-ref refs/remotes/origin/HEAD`); and
   `orchestrate`/`orchestrateContinue` each re-do validate→push→monitor→fix-CI.

**Success criteria:** one `wt` package; three commands unchanged publicly; every
module locked by tests before the next is built; the AI fallback hack deleted; the
`createExec` bug fixed; `wt-clean` goes from 0 → full coverage; no test hits real
GitHub; no test leaks `.worktrees/` into the real repo.

## What to Reuse (Do Not Rewrite)

This is a refactor + test-enablement + merge, not a from-scratch rewrite.

| Asset | Source | Why it stays |
|---|---|---|
| Phase decomposition | `wt-build` Setup→Implement→Validate→Push→Monitor→Fix | Matches `build-worktree` skill scripts 1:1 |
| `BuildWorktreeState` shape | `wt-build/index.ts:14-26` | Round-trips via `appendEntry`/`getBranch` |
| `createExec()` shell wrapper | both files (dedup) | Normalises `Bun.spawn` → `ExecResult`; fix the `?? 0` bug |
| `createHarness()` scripted-AI | `wt-build.test.ts:35-73` | Seed of the new `AiDriver` seam |
| `satisfies Partial<ExtensionAPI>` fakes | `yak-shaving-guard/index.test.ts` | Type-safe fake `pi` for all phase tests |
| `parseWorktreeList` porcelain parser | `wt-clean/index.ts:73-94` | Pure fn; promote to shared `git.ts` |
| `--no-gh` local-only axis | `wt-build` orchestrate | Locks the local half with zero network |

## Technical Design

### Architecture: three injectable seams

Every phase is a pure function of injected collaborators + state. `clean` uses a
subset (`exec` + `io`); `build`/`continue` use all three. This is the 2025
best-practice split — test the orchestration contract, not LLM prose.

```text
        ┌─ /wt-clean ──────▶ clean.run({ exec, io })
        │
/wt ────┼─ /wt-build ─────▶ build.orchestrate(state, { exec, ai, io })
        │                       └─ setup→implement→validate→push→monitor→fix
        └─ /wt-continue ──▶ build.orchestrateContinue(state, { exec, ai, io })
                              └─ recover→implement→validate→push→monitor→fix

seams:  exec: ExecFn   (shell + gh)     ai: AiDriver   (one LLM turn)     io: IoSink   (notify+log)
```

```ts
export type ExecFn   = (command: string) => Promise<ExecResult>;          // exec.ts
export type AiDriver = (prompt: string) => Promise<void>;                 // ai.ts — replaces direct sendMessage
export interface IoSink { notify(msg: string, kind: "info"|"warning"|"error"): void; log(msg: string): void; }
```

The `AiDriver` seam is the key decision: it lets us **delete both the regex test
harness and the regex fallback hack** and makes the AI phase as deterministic as
the git phases.

### Module layout

```text
wt/
  index.ts              # entry only: setLabel, register 3 commands, --no-gh parse, session_start hook
  types.ts              # BuildWorktreeState, ExecResult, CIResult, ExecFn, AiDriver, IoSink, WorktreeEntry
  exec.ts               # createExec, wtExec                          (unified, bug fixed: ?? 1)
  state.ts              # STATE_TYPE, saveState, recoverState
  branch.ts             # slugify, inferBranchPrefix, buildBranchName  (pure)
  git.ts                # detectBaseBranch, parseWorktreeList, listMergedBranches  (shared, from wt-clean)
  ai.ts                 # makeAiDriver(pi, ctx): AiDriver
  io.ts                 # makeIoSink(ctx): IoSink
  clean.ts              # runClean({ exec, io })  — the merged wt-clean logic
  orchestrate.ts        # orchestrateBuild, orchestrateContinue, runRemotePipeline (shared)
  phases/
    setup.ts  implement.ts  commit.ts  validate.ts  push.ts  monitor-ci.ts  fix-ci.ts
  harness/
    test-harness.ts     # createHarness(): { exec, ai, io, scriptedAi, ctx }   (promoted + shared)
    fixtures.ts         # makeRepo(), writeRepoFile(), makeFakeGhExec(), makeMergedWorktreeRepo()
  *.test.ts             # one per module, co-located
```

**The big DRY win — `git.ts`.** Both extensions currently detect the base/main
branch independently (`wt-build` keeps `origin/main`; `wt-clean` strips to `main`).
Unify into `detectBaseBranch(exec): Promise<{ ref: string; name: string }>` used
by `phaseSetup`, `runClean`, and `listMergedBranches`.

### Command surface — FROZEN

| Command | Args | Behavior |
|---|---|---|
| `/wt-build` | `[--no-gh] <task>` | Full pipeline; `--no-gh` skips push/monitor/fix |
| `/wt-continue` | `[--no-gh] <instructions>` | Recover state, follow-up, validate, push existing PR |
| `/wt-continue` | _(empty)_ / no prior build | Usage / "no previous wt-build" warning |
| `/wt-clean` | _(none)_ | Remove worktree dirs for branches merged to main; report |

Names, flags, and `BuildWorktreeState` are frozen. `STATE_TYPE` stays `"wt-build"`
(intentionally **not** renamed to `"wt"`) so in-flight sessions still recover via
`/wt-continue`.

## Implementation Plan — phased, each LOCKED before the next

"Locked" = `bun test` + `bun typecheck` green for that phase before the next
starts. The extension stays loadable at every commit (`index.ts` keeps
re-exporting during extraction). **`clean` is locked first** because it is the
simplest command (no AI, no remote) — it proves the shared `exec`/`git`/`io` seams
work before the complex build phases rely on them.

### Phase A — Foundations + unify exec + housekeeping
- Create `wt/` package; extract `types.ts`, `exec.ts` (**unified, `?? 1` fix**),
  `state.ts`, `branch.ts`, `io.ts`, `git.ts` from both files.
- `index.ts` re-exports so all three commands still register and behave identically.
- Delete `wt-clean/index.ts` (logic now in `wt/clean.ts`). Update `bunfig.toml`
  test root `…/wt-build` → `…/wt`.
- Add `.worktrees/` to `.gitignore`; prune the 3 leftover test worktrees
  (`feat-create-a-stub-hello-v12/v13/v14`).
- **Lock:** original 6 `wt-build` tests green; `wt-clean` still runs; diff is pure
  moves + the `?? 1` fix.

### Phase B — Lock the pure layer
- `branch.ts`: each of the 11 prefix categories, default `feat`, slug truncation
  at 50, unicode/special-char stripping, empty task → `untitled`, multi-sentence
  uses first sentence.
- `state.ts`: round-trip; recover-when-empty → null; recover-latest when
  interleaved with other custom types.
- `git.ts` pure fns: `parseWorktreeList` (main-repo entry, detached HEAD,
  `refs/heads/` stripping), merged-branch-set parsing.
- **Lock:** pure fns fully covered.

### Phase C — Lock `clean` (seam validator; was 0 tests)
- `clean.ts` `runClean({ exec, io })`: detect base, fetch, compute merged, list
  worktrees, remove merged, report removed/kept.
- Tests with REAL git in a temp repo (`makeMergedWorktreeRepo` fixture):
  merged-branch worktree → removed; unmerged → kept; main-repo worktree → never
  touched; detached-HEAD worktree → kept; nothing-to-clean → "No worktrees".
- **Lock:** `clean` fully covered; proves `exec`+`git`+`io` seams before build
  phases depend on them.

### Phase D — Lock build git phases with REAL git
- Make `ExecFn` universal; delete the internal `createExec()` in `phaseImplement`.
- Extract `phases/setup.ts`, `phases/commit.ts` (using `git.detectBaseBranch`).
- Tests in `mkdtemp` repos: setup creates `<root>/.worktrees/<slug>`, correct
  branch, collision → `-v2`, no `origin` → HEAD fallback; commit: nothing-to-commit
  ok, happy path, embedded `"` escaped.
- **Lock:** deterministic git tests; no network.

### Phase E — The AI-driver seam (critical refactor)
- Add `ai.ts` (`makeAiDriver`) + `AiDriver` type.
- `phaseImplement`/`phaseImplementContinue` take `ai: AiDriver`, call `await ai(prompt)`.
- **Delete the regex fallback hack** (lines 306-329). With a contracted `AiDriver`,
  "AI did nothing" is a test bug, not something the orchestrator patches.
- Tests inject scripted `ai` that writes files; assert the prompt contains the
  worktree path + "do not commit"; assert no fallback runs (it's gone).
- **Lock:** AI phase deterministic; ~25 lines of hack removed.

### Phase F — Lock validation
- `phases/validate.ts`. Fixture repo `package.json` scripts `{test, lint, notReal}`:
  only `test`+`lint` discovered/run. Loop with scripted `ai`+real shell: fail →
  fix → pass; max-iter exhaustion → `false` + notify.
- **Lock:** validate loop deterministic without gh.

### Phase G — Lock remote phases with SCRIPTED exec (fake gh, no network)
- `phases/push.ts`, `monitor-ci.ts`, `fix-ci.ts`. Inject `makeFakeGhExec` returning
  canned `gh run list/view`, `gh pr view`, scripted push.
- Cover: push happy; `NO_REMOTE`; push-auth 403/401 → `PUSH_AUTH_FAILURE`; CI
  `success`; `failure` → scripted fix → `success`; `CONFLICTING`/`DIRTY` → rebase
  → force-push; max-CI-retries (5); `TIMEOUT`.
- **Lock:** 100% of gh branches via scripted responses; zero network.

### Phase H — Lock orchestration (wiring + de-dup)
- `orchestrate.ts`. Introduce `runRemotePipeline(exec, ai, io, state, {createPR})`
  for the shared validate→push→monitor→fix-CI; both `orchestrateBuild` and
  `orchestrateContinue` call it (`createPR` distinguishes `gh pr create` vs push).
  Deletes ~40 lines of duplication.
- Move existing `--no-gh` e2e tests (build-then-continue, continue-without-build,
  both usage messages) here; keep green. Add one fully-scripted full-pipeline test
  (fake exec + scripted ai) asserting phase ordering + `state.phase` transitions.
- **Lock:** orchestration green; duplication removed.

### Phase I — Entry point + session resume
- `index.ts` reduced to: `setLabel("WT")`, register 3 commands, `--no-gh` parse,
  `session_start` stale-state warning (`phase !== "done"`).
- Tests: all 3 commands register; usage messages on empty args; stale-state notify.
- **Lock:** entry-point tests green; `index.ts` ≤ ~70 lines.

## Acceptance Criteria

- [ ] One `wt/` package; `wt-build/` and `wt-clean/` dirs gone (merged).
- [ ] `bun test home/omp/.omp/agent/extensions/wt` — all phases green.
- [ ] `bun typecheck` green (per `AGENTS.md`).
- [ ] Commands unchanged: `/wt-build`, `/wt-continue`, `/wt-clean`, `--no-gh`.
- [ ] `wt-clean` goes from 0 tests → full coverage.
- [ ] `createExec` unified across build+clean; `?? 0` bug fixed to `?? 1`.
- [ ] `git.detectBaseBranch` shared (no duplicated base-branch logic).
- [ ] Regex fallback hack deleted; no test depends on it.
- [ ] No test makes a real `gh`/network call.
- [ ] `.worktrees/` gitignored; tests clean up their own worktrees; leftover
      `v12/v13/v14` worktrees pruned.
- [ ] `bunfig.toml` test root updated to `…/wt`.
- [ ] Each phase's tests were green before the next phase started.
- [ ] RPC smoke test (`AGENTS.md`) registers all three commands with no
      `extension_error`.

## Boundaries

- ✅ **Always:** run `bun test` + `bun typecheck` after each phase; don't start the
  next phase until the current is locked; keep `index.ts` re-exporting during
  extraction; align build phase modules 1:1 with `build-worktree` skill scripts;
  lock `clean` first to validate the shared seams.
- ⚠️ **Ask first:** deleting the fallback hack (changes behavior when AI stalls);
  renaming `STATE_TYPE` (rejected — keep `"wt-build"` to preserve recovery);
  changing `clean`'s removal semantics (currently leaves branches intact, removes
  only merged worktree dirs).
- 🚫 **Never:** make a real `gh`/GitHub call from a test; leave `.worktrees/`
  un-gitignored; rename commands/flags; reintroduce the `?? 0` fail-open behavior;
  call `pi.sendMessage`/runtime actions during extension load
  (`ExtensionRuntimeNotInitializedError`); reintroduce message-text regex parsing
  in the harness.

## Testing Strategy (layered)

| Layer | What | Seams | Determinism |
|---|---|---|---|
| **Unit** | `branch.ts`, `state.ts`, `git.ts` pure fns | none | full |
| **Shell** | `exec.ts`, build git phases, **`clean`** | real git in `mkdtemp` | full |
| **Component** | AI phase, validate loop | scripted `ai` + real shell | full |
| **Scripted-remote** | push, monitor-CI, fix-CI | fake `exec` (canned `gh` JSON) | full |
| **Integration** | orchestration `--no-gh` e2e | real git + scripted `ai` | full |
| **Full-pipeline sim** | phase ordering | fake `exec` + scripted `ai` | full |

The validate loop is the built-in local quality gate; CI monitoring is the second.
No LLM-as-judge needed — the LLM is fully abstracted behind `AiDriver`.

## Open Questions

1. `phaseMonitorCI` polling constants (10s×30 appearance, 30s conclusion, 5-min
   timeout): env-overridable for faster tests, or hardcoded + rely on scripted-exec
   to skip waits? (Lean: scripted exec skips waits; keep hardcoded.)
2. Extend `discoverValidationCommands` beyond `package.json`/bun to
   `.github/workflows/` + `pyproject.toml` (as the skill doc describes)? Out of
   scope for this rebuild — file as follow-up.
3. Add `/wt-clean --dry-run`? Useful but not present today — follow-up.

## References

- OMP extension runtime & API — `omp://extensions.md`
- OMP extension authoring guide — `omp://skills/authoring-extensions.md`
- Current build impl — `home/omp/.omp/agent/extensions/wt-build/index.ts`
- Current clean impl — `home/omp/.omp/agent/extensions/wt-clean/index.ts`
- Existing tests + harness — `home/omp/.omp/agent/extensions/wt-build/wt-build.test.ts`
- Fake-`pi` pattern reference — `home/omp/.omp/agent/extensions/yak-shaving-guard/index.test.ts`
- Phase-boundary reference (bash scripts) — `skill://build-worktree`
- Repo validation convention — `AGENTS.md` (`bun typecheck`; RPC smoke test)
- [Addy Osmani: How to write a good spec for AI agents](https://addyo.substack.com/p/how-to-write-a-good-spec-for-ai-agents)
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
