// ---------------------------------------------------------------------------
// Orchestration: build, continue, and shared remote pipeline
// Extracted from wt-build/index.ts to reduce duplication.
// ---------------------------------------------------------------------------

import type { ExecFn, AiDriver, BuildWorktreeState, IoSink } from "./types";
import { phaseImplement, phaseImplementContinue } from "./phases/implement";
import { phaseValidateLoop } from "./phases/validate";
import { phasePushPR } from "./phases/push";
import { phaseCILoop } from "./phases/fix-ci";
import { phaseMonitorCI } from "./phases/monitor-ci";
import { wtExec } from "./exec";
import { commitInWorktree } from "./phases/commit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreatePRFn = (
  exec: ExecFn,
  state: BuildWorktreeState,
  io: IoSink,
) => Promise<void>;

// ---------------------------------------------------------------------------
// Shared remote pipeline
// ---------------------------------------------------------------------------

async function pushExistingBranch(
  exec: ExecFn,
  state: BuildWorktreeState,
  io: IoSink,
): Promise<void> {
  state.phase = "pushing";
  const push = await exec(
    `cd ${state.worktreePath} && git push origin ${state.branch}`,
  );
  if (push.exitCode !== 0) {
    const err = (push.stderr + push.stdout).toLowerCase();
    if (
      err.includes("auth") ||
      err.includes("permission") ||
      err.includes("403") ||
      err.includes("401")
    ) {
      io.notify(
        "Git push auth/permission error. Run `gh auth login` and retry.",
        "error",
      );
      throw new Error("PUSH_AUTH_FAILURE");
    }
    io.notify(`Push failed: ${push.stderr || push.stdout}`, "error");
    throw new Error("PUSH_FAILED");
  }
  io.notify(`Pushed to ${state.branch}`, "info");
}

/**
 * Shared remote pipeline: push (PR create or push-to-existing) → monitor CI → fix CI loop.
 * Pass `createPR = phasePushPR` for new builds, `null` for continues (just push existing branch).
 */
export async function runRemotePipeline(
  exec: ExecFn,
  ai: AiDriver,
  state: BuildWorktreeState,
  io: IoSink,
  createPR: CreatePRFn | null,
  sleep?: (ms: number) => Promise<void>,
): Promise<void> {
  if (createPR) {
    await createPR(exec, state, io);
  } else {
    await pushExistingBranch(exec, state, io);
  }

  const ciResult = await phaseMonitorCI(exec, state, io, sleep);
  await phaseCILoop(exec, ai, state, ciResult, io, sleep);
}
/**
 * Poll the worktree for changes after an AI turn.
 * waitForIdle can return before the AI's filesystem operations complete,
 * so verify changes are visible before proceeding.
 */
async function waitForWorktreeChanges(
  exec: ExecFn,
  state: BuildWorktreeState,
  io: IoSink,
  timeoutMs: number = 10_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await wtExec(exec, state.worktreePath, "git status --porcelain");
    if (r.exitCode !== 0) break;  // git command itself failed; can't poll, proceed
    if (r.stdout.trim().length > 0) return;  // changes detected
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  io.notify(
    `No changes detected in worktree after ${timeoutMs}ms — proceeding`,
    "warning",
  );
}


// ---------------------------------------------------------------------------
// Orchestrate build (fresh worktree, new PR)
// ---------------------------------------------------------------------------
export async function orchestrateBuild(
  exec: ExecFn,
  ai: AiDriver,
  state: BuildWorktreeState,
  opts: { noGh?: boolean },
  io: IoSink,
  sleep?: (ms: number) => Promise<void>,
): Promise<void> {
  state.phase = "implementing";
  await phaseImplement(ai, state, 0);
  await waitForWorktreeChanges(exec, state, io);

  state.phase = "validating";
  const validationOk = await phaseValidateLoop(exec, ai, state, io);
  if (!validationOk) {
    io.notify(
      `Validation failed after max retries. Worktree: ${state.worktreePath}. Run subsequent requests inside the worktree to fix issues manually.`,
      "error",
    );
    state.phase = "validation-failed";
    return;
  }

  if (!opts.noGh) {
    await runRemotePipeline(exec, ai, state, io, phasePushPR, sleep);
  }

  io.notify(
    `Worktree ready at ${state.worktreePath}. Subsequent requests should be run inside this directory to build on this feature.`,
    "info",
  );
}

// ---------------------------------------------------------------------------
// Orchestrate continue (follow-up on existing worktree / PR)
// ---------------------------------------------------------------------------
export async function orchestrateContinue(
  exec: ExecFn,
  ai: AiDriver,
  state: BuildWorktreeState,
  instructions: string,
  opts: { noGh?: boolean },
  io: IoSink,
  sleep?: (ms: number) => Promise<void>,
): Promise<void> {
  await phaseImplementContinue(ai, state, instructions);
  await waitForWorktreeChanges(exec, state, io);

  const prefix = state.branch.split("/")[0];
  const committed = await commitInWorktree(exec, state, `${prefix}: follow-up changes`);
  if (!committed) {
    throw new Error(
      `CONTINUE_FAILED: no changes to commit in ${state.worktreePath}. ` +
      `The follow-up instructions did not produce any file changes.`,
    );
  }

  state.phase = "validating";
  const validationOk = await phaseValidateLoop(exec, ai, state, io);
  if (!validationOk) {
    io.notify(
      `Validation failed after max retries. Worktree: ${state.worktreePath}.`,
      "error",
    );
    state.phase = "validation-failed";
    return;
  }

  if (!opts.noGh) {
    await runRemotePipeline(exec, ai, state, io, null, sleep);
  }

  io.notify(
    opts.noGh
      ? `Follow-up complete. Worktree: ${state.worktreePath} (branch: ${state.branch}). No remote — push manually to proceed.`
      : `Follow-up pushed. Worktree: ${state.worktreePath}, PR #${state.prNumber}.`,
    "info",
  );
}
