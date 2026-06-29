import type { ExecFn, AiDriver, BuildWorktreeState, CIResult, IoSink } from "../types";
import { wtExec } from "../exec";
import { commitInWorktree } from "./commit";
import { phaseImplement } from "./implement";
import { getFailedJobs, getFailedLogs, phaseMonitorCI } from "./monitor-ci";

// ---------------------------------------------------------------------------
// Phase 5: Fix CI failures — fetch logs, send to AI, implement fix
// ---------------------------------------------------------------------------

export async function phaseFixCI(
  exec: ExecFn,
  ai: AiDriver,
  state: BuildWorktreeState,
  runId: number,
  io: IoSink,
): Promise<void> {
  io.notify("Fetching CI failure logs...", "info");

  const failedJobs = await getFailedJobs(exec, runId);
  const logs = await getFailedLogs(exec, runId);

  const ciFailureMessage = [
    `## CI failures`,
    ``,
    `Failed jobs: ${failedJobs.join(", ")}`,
    ``,
    `\`\`\`\n${logs.slice(0, 10_000)}\n\`\`\``,
    ``,
    `Fix the issues in the worktree: \`${state.worktreePath}\``,
    `Use \`cd ${state.worktreePath}\` before any file operation or command.`,
    `Do NOT commit changes.`,
  ].join("\n");

  await phaseImplement(ai, state, state.ciIteration + 1, ciFailureMessage);
}

// ---------------------------------------------------------------------------
// Phase 5 loop — CI failure retries (up to 5×)
// ---------------------------------------------------------------------------

export async function phaseCILoop(
  exec: ExecFn,
  ai: AiDriver,
  state: BuildWorktreeState,
  ciResult: CIResult,
  io: IoSink,
  sleep: (ms: number) => Promise<void> = (ms) => {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, ms);
    return promise;
  },
): Promise<void> {
  const MAX_CI_ITERS = 5;

  while (
    ciResult.conclusion !== "success" &&
    ciResult.conclusion !== "TIMEOUT" &&
    state.ciIteration < MAX_CI_ITERS
  ) {
    // Handle merge conflicts
    if (
      ciResult.mergeable === "CONFLICTING" ||
      ciResult.mergeStateStatus === "DIRTY"
    ) {
      io.notify(
        "Merge conflict detected. Rebasing onto base branch...",
        "warning",
      );
      const baseRef = state.baseBranch.replace(/^origin\//, "");
      await wtExec(
        exec,
        state.worktreePath,
        `git fetch origin ${baseRef}`,
      );
      const rebase = await wtExec(
        exec,
        state.worktreePath,
        `git rebase ${state.baseBranch}`,
      );
      if (rebase.exitCode !== 0) {
        io.notify(
          "Merge conflict — resolve manually in the worktree, then force push.",
          "error",
        );
        throw new Error("MERGE_CONFLICT");
      }
      const push = await wtExec(
        exec,
        state.worktreePath,
        `git push --force-with-lease origin ${state.branch}`,
      );
      if (push.exitCode !== 0) {
        io.notify("Force push after rebase failed", "error");
        throw new Error("PUSH_FAILED");
      }
      // Re-monitor
      ciResult = await phaseMonitorCI(exec, state, io, sleep);
      continue;
    }

    // Fix CI failures
    state.ciIteration++;
    state.phase = `fixing-ci (${state.ciIteration}/${MAX_CI_ITERS})`;

    await phaseFixCI(exec, ai, state, ciResult.runId!, io);

    // Commit and push
    const commitMsg = `fix: CI issues (attempt ${state.ciIteration})`;
    await commitInWorktree(exec, state, commitMsg);

    const push = await wtExec(
      exec,
      state.worktreePath,
      `git push origin ${state.branch}`,
    );
    if (push.exitCode !== 0) {
      io.notify(`Push failed: ${push.stderr}`, "error");
      throw new Error("PUSH_FAILED");
    }

    ciResult = await phaseMonitorCI(exec, state, io, sleep);
  }

  if (ciResult.conclusion === "success") {
    state.phase = "done";
    io.notify(
      `CI passed! PR #${state.prNumber} is ready. Branch: ${state.branch}`,
      "info",
    );
  } else if (state.ciIteration >= MAX_CI_ITERS) {
    state.phase = "ci-max-retries";
    io.notify(
      `CI failed after ${MAX_CI_ITERS} attempts. Branch: ${state.branch}`,
      "error",
    );
  }
}
