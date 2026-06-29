import { test, expect, describe } from "bun:test";
import {
  getRunId,
  getRunConclusion,
  getPRMergeState,
  getFailedJobs,
  getFailedLogs,
  phaseMonitorCI,
} from "./monitor-ci";
import type { ExecFn, BuildWorktreeState, CIResult, IoSink } from "../types";

// ---------------------------------------------------------------------------
// Fake Gh Exec
// ---------------------------------------------------------------------------

type FakeExecResponse = {
  stdout: string;
  stderr?: string;
  exitCode?: number;
};
type FakeExecMap = Record<
  string,
  FakeExecResponse | ((cmd: string) => FakeExecResponse)
>;

function makeFakeGhExec(responses: FakeExecMap): ExecFn {
  return async (command: string) => {
    for (const [pattern, resp] of Object.entries(responses)) {
      if (command.includes(pattern)) {
        const resolved =
          typeof resp === "function" ? resp(command) : resp;
        return {
          stdout: resolved.stdout,
          stderr: resolved.stderr ?? "",
          exitCode: resolved.exitCode ?? 0,
        };
      }
    }
    return {
      stdout: "",
      stderr: `Unexpected command: ${command}`,
      exitCode: 1,
    };
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sleep that resolves immediately — no real delays in tests. */
const fastSleep = async (_ms: number) => {};

function makeState(
  overrides: Partial<BuildWorktreeState> = {},
): BuildWorktreeState {
  return {
    branch: "feat/test",
    baseBranch: "origin/main",
    repoRoot: "/tmp/repo",
    worktreePath: "/tmp/repo/.worktrees/feat-test",
    prNumber: 42,
    runId: null,
    phase: "pushed",
    task: "Add a test feature",
    validationIteration: 0,
    ciIteration: 0,
    failures: [],
    ...overrides,
  };
}

function makeTestIo(): {
  io: IoSink;
  notifications: Array<{ msg: string; kind: string }>;
} {
  const notifications: Array<{ msg: string; kind: string }> = [];
  return {
    io: {
      notify(msg, kind) {
        notifications.push({ msg, kind });
      },
      log() {},
    },
    notifications,
  };
}

// ---------------------------------------------------------------------------
// getRunId
// ---------------------------------------------------------------------------

describe("getRunId", () => {
  test("returns numeric ID when gh responds", async () => {
    const exec = makeFakeGhExec({
      "gh run list": { stdout: "42" },
    });
    expect(await getRunId(exec, "feat/test")).toBe(42);
  });

  test("returns null on empty response", async () => {
    const exec = makeFakeGhExec({
      "gh run list": { stdout: "" },
    });
    expect(await getRunId(exec, "feat/test")).toBeNull();
  });

  test("returns null on non-numeric response", async () => {
    const exec = makeFakeGhExec({
      "gh run list": { stdout: "null" },
    });
    expect(await getRunId(exec, "feat/test")).toBeNull();
  });

  test("returns null on exec error", async () => {
    const exec = makeFakeGhExec({
      "gh run list": { stdout: "", exitCode: 1 },
    });
    expect(await getRunId(exec, "feat/test")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getRunConclusion
// ---------------------------------------------------------------------------

describe("getRunConclusion", () => {
  test("returns conclusion from gh", async () => {
    const exec = makeFakeGhExec({
      "--json conclusion": { stdout: "success" },
    });
    expect(await getRunConclusion(exec, 1)).toBe("success");
  });

  test('returns "pending" on empty response', async () => {
    const exec = makeFakeGhExec({
      "--json conclusion": { stdout: "" },
    });
    expect(await getRunConclusion(exec, 1)).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// getPRMergeState
// ---------------------------------------------------------------------------

describe("getPRMergeState", () => {
  test("returns parsed merge state on success", async () => {
    const exec = makeFakeGhExec({
      "--json mergeable": {
        stdout: JSON.stringify({
          mergeable: "MERGEABLE",
          mergeStateStatus: "CLEAN",
        }),
      },
    });
    const result = await getPRMergeState(exec, 42);
    expect(result.mergeable).toBe("MERGEABLE");
    expect(result.mergeStateStatus).toBe("CLEAN");
  });

  test("returns CONFLICTING when detected", async () => {
    const exec = makeFakeGhExec({
      "--json mergeable": {
        stdout: JSON.stringify({
          mergeable: "CONFLICTING",
          mergeStateStatus: "DIRTY",
        }),
      },
    });
    const result = await getPRMergeState(exec, 42);
    expect(result.mergeable).toBe("CONFLICTING");
    expect(result.mergeStateStatus).toBe("DIRTY");
  });

  test("returns UNKNOWN on exec error", async () => {
    const exec = makeFakeGhExec({
      "--json mergeable": { stdout: "", exitCode: 1 },
    });
    const result = await getPRMergeState(exec, 42);
    expect(result.mergeable).toBe("UNKNOWN");
    expect(result.mergeStateStatus).toBe("UNKNOWN");
  });

  test("returns UNKNOWN on unparseable JSON", async () => {
    const exec = makeFakeGhExec({
      "--json mergeable": { stdout: "not json" },
    });
    const result = await getPRMergeState(exec, 42);
    expect(result.mergeable).toBe("UNKNOWN");
    expect(result.mergeStateStatus).toBe("UNKNOWN");
  });
});

// ---------------------------------------------------------------------------
// getFailedJobs
// ---------------------------------------------------------------------------

describe("getFailedJobs", () => {
  test("returns array of failed job names", async () => {
    const exec = makeFakeGhExec({
      "--json jobs": { stdout: "lint\ntest" },
    });
    const jobs = await getFailedJobs(exec, 1);
    expect(jobs).toEqual(["lint", "test"]);
  });

  test("returns empty array on exec error", async () => {
    const exec = makeFakeGhExec({
      "--json jobs": { stdout: "", exitCode: 1 },
    });
    expect(await getFailedJobs(exec, 1)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getFailedLogs
// ---------------------------------------------------------------------------

describe("getFailedLogs", () => {
  test("returns log text from gh", async () => {
    const exec = makeFakeGhExec({
      "--log-failed": { stdout: "ERROR: test failed" },
    });
    expect(await getFailedLogs(exec, 1)).toBe("ERROR: test failed");
  });

  test('returns "(no logs)" on empty output', async () => {
    const exec = makeFakeGhExec({
      "--log-failed": { stdout: "", stderr: "" },
    });
    expect(await getFailedLogs(exec, 1)).toBe("(no logs)");
  });
});

// ---------------------------------------------------------------------------
// phaseMonitorCI
// ---------------------------------------------------------------------------

describe("phaseMonitorCI", () => {
  test("CI appears immediately, returns success conclusion", async () => {
    const exec = makeFakeGhExec({
      "gh run list": { stdout: "42" },
      "--json conclusion": { stdout: "success" },
      "--json mergeable": {
        stdout: JSON.stringify({
          mergeable: "MERGEABLE",
          mergeStateStatus: "CLEAN",
        }),
      },
    });
    const state = makeState();
    const { io } = makeTestIo();

    const result: CIResult = await phaseMonitorCI(
      exec,
      state,
      io,
      fastSleep,
    );

    expect(result.conclusion).toBe("success");
    expect(result.runId).toBe(42);
    expect(result.mergeable).toBe("MERGEABLE");
    expect(state.runId).toBe(42);
  });

  test("returns failure conclusion when CI fails", async () => {
    const exec = makeFakeGhExec({
      "gh run list": { stdout: "42" },
      "--json conclusion": { stdout: "failure" },
      "--json mergeable": {
        stdout: JSON.stringify({
          mergeable: "MERGEABLE",
          mergeStateStatus: "CLEAN",
        }),
      },
    });
    const state = makeState();
    const { io } = makeTestIo();

    const result = await phaseMonitorCI(exec, state, io, fastSleep);

    expect(result.conclusion).toBe("failure");
    expect(result.runId).toBe(42);
  });

  test("returns TIMEOUT when no CI run appears", async () => {
    // Return empty for gh run list every time → never appears
    const exec = makeFakeGhExec({
      "gh run list": { stdout: "" },
    });
    const state = makeState();
    const { io } = makeTestIo();

    const result = await phaseMonitorCI(exec, state, io, fastSleep);

    expect(result.conclusion).toBe("TIMEOUT");
    expect(result.runId).toBeNull();
    expect(result.mergeable).toBe("UNKNOWN");
  });
});
