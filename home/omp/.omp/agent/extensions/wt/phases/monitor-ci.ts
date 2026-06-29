import type { ExecFn, BuildWorktreeState, CIResult, IoSink } from "../types";

// ---------------------------------------------------------------------------
// Helper: sleep using Promise.withResolvers
// ---------------------------------------------------------------------------

function realSleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

// ---------------------------------------------------------------------------
// CI helper queries
// ---------------------------------------------------------------------------

export async function getRunId(
  exec: ExecFn,
  branch: string,
): Promise<number | null> {
  const r = await exec(
    `gh run list --branch ${branch} --limit 1 --json databaseId --jq '.[0].databaseId'`,
  );
  if (r.exitCode !== 0 || !r.stdout.trim()) return null;
  const id = Number(r.stdout.trim());
  return Number.isFinite(id) ? id : null;
}

export async function getRunConclusion(
  exec: ExecFn,
  runId: number,
): Promise<string> {
  const r = await exec(
    `gh run view ${runId} --json conclusion --jq '.conclusion'`,
  );
  return r.stdout.trim() || "pending";
}

export async function getPRMergeState(
  exec: ExecFn,
  prNumber: number,
): Promise<{ mergeable: string; mergeStateStatus: string }> {
  const r = await exec(
    `gh pr view ${prNumber} --json mergeable,mergeStateStatus --jq '{mergeable, mergeStateStatus}'`,
  );
  if (r.exitCode !== 0)
    return { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" };
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" };
  }
}

export async function getFailedJobs(
  exec: ExecFn,
  runId: number,
): Promise<string[]> {
  const r = await exec(
    `gh run view ${runId} --json jobs --jq '.jobs[] | select(.conclusion != "success") | .name'`,
  );
  if (r.exitCode !== 0 || !r.stdout.trim()) return [];
  return r.stdout.trim().split("\n").filter(Boolean);
}

export async function getFailedLogs(
  exec: ExecFn,
  runId: number,
): Promise<string> {
  const r = await exec(`gh run view ${runId} --log-failed`);
  return r.stdout || r.stderr || "(no logs)";
}

// ---------------------------------------------------------------------------
// Phase 4: Monitor CI — poll for run, wait for conclusion
// ---------------------------------------------------------------------------

export async function phaseMonitorCI(
  exec: ExecFn,
  state: BuildWorktreeState,
  io: IoSink,
  sleep: (ms: number) => Promise<void> = realSleep,
): Promise<CIResult> {
  io.notify("Waiting for CI run to appear...", "info");

  // Wait up to 5 min for CI to appear
  let runId = await getRunId(exec, state.branch);
  for (let i = 0; i < 30 && runId === null; i++) {
    await sleep(10_000);
    runId = await getRunId(exec, state.branch);
  }
  if (runId === null) {
    io.notify("No CI run appeared after 5 minutes", "warning");
    return {
      conclusion: "TIMEOUT",
      runId: null,
      mergeable: "UNKNOWN",
      mergeStateStatus: "UNKNOWN",
    };
  }

  state.runId = runId;
  state.phase = "monitoring-ci";

  // Poll every 30s until conclusion is reached
  let conclusion = "";
  while (true) {
    await sleep(30_000);
    conclusion = await getRunConclusion(exec, runId);
    io.notify(`CI status: ${conclusion}`, "info");

    if (["success", "failure", "cancelled", "timed_out"].includes(conclusion)) {
      break;
    }
  }

  const mergeState = await getPRMergeState(exec, state.prNumber!);

  return {
    conclusion,
    runId,
    mergeable: mergeState.mergeable,
    mergeStateStatus: mergeState.mergeStateStatus,
  };
}
