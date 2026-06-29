// ---------------------------------------------------------------------------
// Tests for orchestrate.ts — fully scripted exec + scripted ai
// ---------------------------------------------------------------------------

import { test, expect, describe, mock, beforeAll, afterAll } from "bun:test";
import type { ExecFn, AiDriver, BuildWorktreeState, IoSink, CIResult } from "./types";

// ──────────────────────────────────────────────────
// Mocks for sleep-heavy CI phases
// These are set up before any test imports orchestrate
// so the mock registry intercepts the module loads.
// ──────────────────────────────────────────────────

const monitorCalls: {
  exec: ExecFn;
  state: BuildWorktreeState;
  io: IoSink;
}[] = [];
const ciLoopCalls: {
  exec: ExecFn;
  state: BuildWorktreeState;
  ciResult: CIResult;
  io: IoSink;
}[] = [];

beforeAll(() => {
  mock.module("./phases/monitor-ci", () => ({
    phaseMonitorCI: async (
      exec: ExecFn,
      state: BuildWorktreeState,
      io: IoSink,
    ): Promise<CIResult> => {
      monitorCalls.push({ exec, state, io });
      return {
        conclusion: "success",
        runId: 42,
        mergeable: "MERGEABLE",
        mergeStateStatus: "CLEAN",
      };
    },
  }));

  mock.module("./phases/fix-ci", () => ({
    phaseCILoop: async (
      exec: ExecFn,
      _ai: AiDriver,
      state: BuildWorktreeState,
      ciResult: CIResult,
      io: IoSink,
    ): Promise<void> => {
      ciLoopCalls.push({ exec, state, ciResult, io });
    },
  }));
});

afterAll(() => {
  mock.restore();
});

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function makeFakeExec(
  responses: Record<string, { stdout: string; stderr?: string; exitCode?: number }>,
): ExecFn {
  return async (cmd: string) => {
    for (const [pat, r] of Object.entries(responses)) {
      if (cmd.includes(pat)) {
        return { stdout: r.stdout, stderr: r.stderr ?? "", exitCode: r.exitCode ?? 0 };
      }
    }
    return { stdout: "", stderr: `UNEXPECTED: ${cmd}`, exitCode: 1 };
  };
}

const silentAi: AiDriver = async () => {};

function makeTestIo(): { io: IoSink; notifs: { msg: string; kind: string }[] } {
  const notifs: { msg: string; kind: string }[] = [];
  return {
    io: {
      notify: (msg: string, kind: "info" | "warning" | "error") => {
        notifs.push({ msg, kind });
      },
      log: () => {},
    },
    notifs,
  };
}

const MIN_STATE: BuildWorktreeState = {
  branch: "feat/test",
  baseBranch: "origin/main",
  repoRoot: "/tmp/repo",
  worktreePath: "/tmp/repo/.worktrees/feat-test",
  prNumber: null,
  runId: null,
  phase: "setup",
  task: "Create a test file",
  validationIteration: 0,
  ciIteration: 0,
  failures: [],
};

// ──────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────

describe("orchestrateBuild --no-gh", () => {
  test("completes with implementing -> validating -> done (no push)", async () => {
    monitorCalls.length = 0;
    ciLoopCalls.length = 0;

    const { orchestrateBuild } = await import("./orchestrate");

    // Validation skipped: package.json discovery returns nothing
    const exec = makeFakeExec({
      "bun -e": { stdout: "", exitCode: 1 },
      "git add -A": { stdout: "", exitCode: 0 },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git commit -m": { stdout: "ok", exitCode: 0 },
    });

    const { io, notifs } = makeTestIo();
    const state = { ...MIN_STATE };

    await orchestrateBuild(exec, silentAi, state, { noGh: true }, io);

    expect(state.phase).not.toBe("validation-failed");
    expect(notifs.some((n) => n.msg.includes("Worktree ready at"))).toBe(true);
    // pipeline functions should NOT have been called
    expect(monitorCalls.length).toBe(0);
    expect(ciLoopCalls.length).toBe(0);
  });
});

describe("orchestrateBuild with validation failure", () => {
  test("stops at validation-failed after max retries", async () => {
    monitorCalls.length = 0;
    ciLoopCalls.length = 0;

    const { orchestrateBuild } = await import("./orchestrate");

    // Discover "test" script, but it always fails
    const exec = makeFakeExec({
      "bun -e": { stdout: "test", exitCode: 0 },
      "bun run test": { stdout: "", stderr: "FAIL", exitCode: 1 },
      "git add -A": { stdout: "", exitCode: 0 },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git commit -m": { stdout: "ok", exitCode: 0 },
    });

    const { io, notifs } = makeTestIo();
    const state = { ...MIN_STATE };

    await orchestrateBuild(exec, silentAi, state, { noGh: false }, io);

    expect(state.phase).toBe("validation-failed");
    expect(
      notifs.some(
        (n) => n.kind === "error" && n.msg.includes("Validation failed"),
      ),
    ).toBe(true);
  });
});

describe("orchestrateContinue --no-gh", () => {
  test("completes implementContinue + commit + validate", async () => {
    monitorCalls.length = 0;
    ciLoopCalls.length = 0;

    const { orchestrateContinue } = await import("./orchestrate");

    const exec = makeFakeExec({
      "bun -e": { stdout: "", exitCode: 1 },
      "git add -A": { stdout: "", exitCode: 0 },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git commit -m": { stdout: "ok", exitCode: 0 },
      "test -d": { stdout: "", exitCode: 0 },
    });

    const { io, notifs } = makeTestIo();
    const state = {
      ...MIN_STATE,
      branch: "feat/follow-up",
      prNumber: 123,
    };

    await orchestrateContinue(
      exec,
      silentAi,
      state,
      "Add more tests",
      { noGh: true },
      io,
    );

    expect(state.phase).not.toBe("validation-failed");
    const followUpMsg = notifs.find((n) => n.msg.includes("Follow-up complete"));
    expect(followUpMsg).toBeDefined();
    expect(followUpMsg!.msg).toContain("No remote");
  });
});

describe("runRemotePipeline with createPR", () => {
  test("calls phasePushPR -> phaseMonitorCI -> phaseCILoop", async () => {
    monitorCalls.length = 0;
    ciLoopCalls.length = 0;

    const { runRemotePipeline } = await import("./orchestrate");
    const { phasePushPR } = await import("./phases/push");

    const exec = makeFakeExec({
      "git push": { stdout: "", exitCode: 0 },
      "git remote get-url origin": { stdout: "git@github.com:user/repo.git", exitCode: 0 },
      "gh pr create": { stdout: "https://github.com/user/repo/pull/123", exitCode: 0 },
    });

    const { io: _io } = makeTestIo();
    const state = { ...MIN_STATE, prNumber: 123 };

    await runRemotePipeline(exec, silentAi, state, _io, phasePushPR);

    expect(state.phase).toBe("pushed");
    expect(monitorCalls.length).toBe(1);
    expect(ciLoopCalls.length).toBe(1);
    expect(monitorCalls[0]!.state).toBe(state);
  });
});

describe("runRemotePipeline with createPR=null (push existing)", () => {
  test("calls pushExisting -> phaseMonitorCI -> phaseCILoop", async () => {
    monitorCalls.length = 0;
    ciLoopCalls.length = 0;

    const { runRemotePipeline } = await import("./orchestrate");

    const exec = makeFakeExec({
      "git push origin": { stdout: "", exitCode: 0 },
    });

    const { io: _io } = makeTestIo();
    const state = { ...MIN_STATE, prNumber: 456 };

    await runRemotePipeline(exec, silentAi, state, _io, null);

    expect(monitorCalls.length).toBe(1);
    expect(ciLoopCalls.length).toBe(1);
  });
});
