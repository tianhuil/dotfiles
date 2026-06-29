// ---------------------------------------------------------------------------
// Tests for orchestrate.ts — fully scripted exec + scripted ai
// Uses dependency injection (sleep parameter) instead of mock.module
// to avoid module-cache pollution across test files.
// ---------------------------------------------------------------------------

import { test, expect, describe } from "bun:test";
import type { ExecFn, AiDriver, BuildWorktreeState, IoSink } from "./types";

// Import the REAL functions (no mocking needed — sleep is injected)
import {
  orchestrateBuild,
  orchestrateContinue,
  runRemotePipeline,
} from "./orchestrate";
import { phasePushPR } from "./phases/push";

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

/** No-op sleep: makes CI-phase tests instant */
const noSleep = async () => {};

function makeFakeExec(
  responses: Record<
    string,
    { stdout: string; stderr?: string; exitCode?: number }
  >,
): ExecFn {
  return async (cmd: string) => {
    for (const [pat, r] of Object.entries(responses)) {
      if (cmd.includes(pat)) {
        return {
          stdout: r.stdout,
          stderr: r.stderr ?? "",
          exitCode: r.exitCode ?? 0,
        };
      }
    }
    return { stdout: "", stderr: `UNEXPECTED: ${cmd}`, exitCode: 1 };
  };
}

const silentAi: AiDriver = async () => {};

function makeTestIo(): {
  io: IoSink;
  notifs: { msg: string; kind: string }[];
} {
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
  test("completes implement + validate, no remote pipeline", async () => {
    // Fake exec: discoverValidationCommands finds "test" script,
    // "bun run test" passes, git commands succeed
    const exec = makeFakeExec({
      'console.log(Object.keys(s).join' : { stdout: "test\nlint", exitCode: 0 },
      "bun run test": { stdout: "", exitCode: 0 },
      "bun run lint": { stdout: "", exitCode: 0 },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git add -A": { stdout: "", exitCode: 0 },
      "git commit -m": { stdout: "", exitCode: 0 },
    });
    const { io, notifs } = makeTestIo();

    const state = { ...MIN_STATE };
    await orchestrateBuild(exec, silentAi, state, { noGh: true }, io, noSleep);

    // Validation did NOT fail
    expect(state.phase).not.toBe("validation-failed");
    // Validation succeeded (passed on 1st iteration)
    expect(state.validationIteration).toBe(1);

    // Worktree ready notification
    const readyMsg = notifs.find((n) => n.msg.includes("Worktree ready"));
    expect(readyMsg).toBeDefined();
  });
});

describe("orchestrateBuild with validation failure", () => {
  test("enters validation-failed phase after max retries", async () => {
    // All validation commands fail
    const exec = makeFakeExec({
      'console.log(Object.keys(s).join' : { stdout: "test", exitCode: 0 },
      "bun run test": { stdout: "", stderr: "FAIL", exitCode: 1 },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git add -A": { stdout: "", exitCode: 0 },
      "git commit -m": { stdout: "", exitCode: 0 },
    });
    const { io } = makeTestIo();

    const state = { ...MIN_STATE, failures: [] };
    await orchestrateBuild(exec, silentAi, state, { noGh: true }, io, noSleep);

    // Should have failed after max retries
    expect(state.phase).toBe("validation-failed");
    expect(state.validationIteration).toBe(5);
  });
});

describe("orchestrateContinue --no-gh", () => {
  test("completes implementContinue + commit + validate", async () => {
    const exec = makeFakeExec({
      'console.log(Object.keys(s).join' : { stdout: "test", exitCode: 0 },
      "bun run test": { stdout: "", exitCode: 0 },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git add -A": { stdout: "", exitCode: 0 },
      "git commit -m": { stdout: "ok", exitCode: 0 },
    });
    const { io, notifs } = makeTestIo();

    const state = { ...MIN_STATE, prNumber: 42 };
    await orchestrateContinue(
      exec,
      silentAi,
      state,
      "Add error handling",
      { noGh: true },
      io,
      noSleep,
    );

    expect(state.phase).not.toBe("validation-failed");
    expect(state.validationIteration).toBeGreaterThanOrEqual(1);

    // Follow-up complete notification
    const followupMsg = notifs.find((n) =>
      n.msg.includes("Follow-up complete"),
    );
    expect(followupMsg).toBeDefined();
  });
});

describe("runRemotePipeline with createPR", () => {
  test("pushes, monitors CI, and runs CI loop", async () => {
    const exec = makeFakeExec({
      "git remote get-url origin": { stdout: "git@github.com:org/repo.git", exitCode: 0 },
      "git push": { stdout: "", exitCode: 0 },
      "gh pr create": { stdout: "https://github.com/org/repo/pull/42", exitCode: 0 },
      "gh run list": { stdout: "99", exitCode: 0 },
      "gh run view": { stdout: "success", exitCode: 0 },
      "gh pr view": {
        stdout: JSON.stringify({ mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" }),
        exitCode: 0,
      },
      // git commands for CI loop commit
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git add -A": { stdout: "", exitCode: 0 },
      "git commit -m": { stdout: "", exitCode: 0 },
      // For commit detection in phaseCILoop
      'console.log(Object.keys(s).join': { stdout: "test", exitCode: 0 },
    });
    const { io } = makeTestIo();

    const state = { ...MIN_STATE, phase: "validating" };
    await runRemotePipeline(exec, silentAi, state, io, phasePushPR, noSleep);

    expect(state.prNumber).toBe(42);
    expect(state.phase).toBe("done"); // CI success -> phase "done"
  });
});

describe("runRemotePipeline with createPR=null (push existing)", () => {
  test("pushes existing branch, monitors CI, runs CI loop", async () => {
    const exec = makeFakeExec({
      "git remote get-url origin": { stdout: "git@github.com:org/repo.git", exitCode: 0 },
      "git push": { stdout: "", exitCode: 0 },
      "gh run list": { stdout: "99", exitCode: 0 },
      "gh run view": { stdout: "success", exitCode: 0 },
      "gh pr view": {
        stdout: JSON.stringify({ mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" }),
        exitCode: 0,
      },
      "git diff --cached --quiet": { stdout: "", exitCode: 1 },
      "git add -A": { stdout: "", exitCode: 0 },
      "git commit -m": { stdout: "", exitCode: 0 },
      'console.log(Object.keys(s).join': { stdout: "test", exitCode: 0 },
    });
    const { io } = makeTestIo();

    const state = { ...MIN_STATE, phase: "validating", prNumber: 42 };
    await runRemotePipeline(exec, silentAi, state, io, null, noSleep);

    // Pushed to existing branch (no new PR)
    expect(state.prNumber).toBe(42); // unchanged
    expect(state.phase).toBe("done");
  });
});
