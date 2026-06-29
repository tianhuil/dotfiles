import { test, expect, describe } from "bun:test";
import { phaseFixCI, phaseCILoop } from "./fix-ci";
import type {
  ExecFn,
  AiDriver,
  BuildWorktreeState,
  CIResult,
  IoSink,
} from "../types";

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

function scriptedAi(): AiDriver {
  return async (_prompt: string) => {};
}

// ---------------------------------------------------------------------------
// phaseFixCI
// ---------------------------------------------------------------------------

describe("phaseFixCI", () => {
  test("fetches logs and calls phaseImplement with failure message", async () => {
    const exec = makeFakeGhExec({
      "--json jobs": { stdout: "lint" },
      "--log-failed": { stdout: "ERROR: lint: syntax error" },
    });
    let calledWith = "";
    const ai: AiDriver = async (p) => {
      calledWith = p;
    };
    const state = makeState();
    const { io } = makeTestIo();

    await phaseFixCI(exec, ai, state, 1, io);

    // ai should have been called with a CI failure message containing the log
    expect(calledWith).toContain("CI failures");
    expect(calledWith).toContain("lint");
    expect(calledWith).toContain("ERROR: lint: syntax error");
    expect(calledWith).toContain("/tmp/repo/.worktrees/feat-test");
  });

  test("handles empty jobs gracefully", async () => {
    const exec = makeFakeGhExec({
      "--json jobs": { stdout: "" },
      "--log-failed": { stdout: "ERROR: something failed" },
    });
    const ai = scriptedAi();
    const state = makeState();
    const { io } = makeTestIo();

    await phaseFixCI(exec, ai, state, 1, io);
    // No throw = pass
  });
});

// ---------------------------------------------------------------------------
// phaseCILoop
// ---------------------------------------------------------------------------

describe("phaseCILoop", () => {
  test("success path: loop exits immediately when CI already passed", async () => {
    const exec = makeFakeGhExec({});
    const ai = scriptedAi();
    const state = makeState();
    const ciResult: CIResult = {
      conclusion: "success",
      runId: 42,
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
    };
    const { io, notifications } = makeTestIo();

    await phaseCILoop(exec, ai, state, ciResult, io, fastSleep);

    expect(state.phase).toBe("done");
    expect(notifications.some((n) => n.msg.includes("CI passed"))).toBe(true);
    expect(state.ciIteration).toBe(0);
  });

  test("merge conflict: rebases, force-pushes, and re-monitors to success", async () => {
    const exec = makeFakeGhExec({
      // Merge conflict handling
      "git fetch origin": { stdout: "" },
      "git rebase origin/main": { stdout: "Successfully rebased" },
      "git push --force-with-lease": { stdout: "Everything up-to-date" },
      // phaseMonitorCI after rebase
      "gh run list": { stdout: "42" },
      "--json conclusion": { stdout: "success" },
      "--json mergeable": {
        stdout: JSON.stringify({
          mergeable: "MERGEABLE",
          mergeStateStatus: "CLEAN",
        }),
      },
    });
    const ai = scriptedAi();
    const state = makeState();
    const ciResult: CIResult = {
      conclusion: "failure",
      runId: 42,
      mergeable: "CONFLICTING",
      mergeStateStatus: "DIRTY",
    };
    const { io } = makeTestIo();

    await phaseCILoop(exec, ai, state, ciResult, io, fastSleep);

    expect(state.phase).toBe("done");
    // ciIteration should NOT have incremented in the merge-conflict handler
    expect(state.ciIteration).toBe(0);
  });

  test("CI failure fixed in one iteration: fix, commit, push, monitor, done", async () => {
    let aiCallCount = 0;
    const ai: AiDriver = async (_p) => {
      aiCallCount++;
    };
    const exec = makeFakeGhExec({
      // getFailedJobs / getFailedLogs
      "--json jobs": { stdout: "test" },
      "--log-failed": { stdout: "ERROR: test failed" },
      // commitInWorktree
      "git add -A": { stdout: "", exitCode: 0 },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git commit -m": {
        stdout: "[feat/test abc123] fix: CI issues (attempt 1)",
        exitCode: 0,
      },
      // push
      "git push origin": { stdout: "Everything up-to-date", exitCode: 0 },
      // phaseMonitorCI after push
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
    const ciResult: CIResult = {
      conclusion: "failure",
      runId: 1,
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
    };
    const { io, notifications } = makeTestIo();

    await phaseCILoop(exec, ai, state, ciResult, io, fastSleep);

    expect(state.phase).toBe("done");
    expect(state.ciIteration).toBe(1);
    expect(aiCallCount).toBe(1);
    expect(notifications.some((n) => n.msg.includes("CI passed"))).toBe(true);
  });

  test("max retries exhausted: ciIteration reaches 5, phase becomes ci-max-retries", async () => {
    let aiCallCount = 0;
    const ai: AiDriver = async (_p) => {
      aiCallCount++;
    };
    const exec = makeFakeGhExec({
      // getFailedJobs / getFailedLogs (repeated every iteration)
      "--json jobs": { stdout: "test" },
      "--log-failed": { stdout: "ERROR: test failed" },
      // commitInWorktree (repeated)
      "git add -A": { stdout: "", exitCode: 0 },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git commit -m": { stdout: "OK", exitCode: 0 },
      // git push (repeated)
      "git push origin": { stdout: "OK", exitCode: 0 },
      // phaseMonitorCI — keep returning "failure" to stay in the loop
      "gh run list": { stdout: "1" },
      "--json conclusion": { stdout: "failure" },
      "--json mergeable": {
        stdout: JSON.stringify({
          mergeable: "MERGEABLE",
          mergeStateStatus: "CLEAN",
        }),
      },
    });
    const state = makeState({ ciIteration: 0 });
    const ciResult: CIResult = {
      conclusion: "failure",
      runId: 1,
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
    };
    const { io, notifications } = makeTestIo();

    await phaseCILoop(exec, ai, state, ciResult, io, fastSleep);

    expect(state.ciIteration).toBe(5);
    expect(state.phase).toBe("ci-max-retries");
    expect(aiCallCount).toBe(5);
    expect(
      notifications.some((n) => n.msg.includes("CI failed after 5 attempts")),
    ).toBe(true);
  });
});
