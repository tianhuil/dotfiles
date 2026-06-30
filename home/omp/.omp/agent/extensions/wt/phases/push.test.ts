import { test, expect, describe } from "bun:test";
import { phasePushPR } from "./push";
import type { ExecFn, BuildWorktreeState, IoSink } from "../types";

// ---------------------------------------------------------------------------
// Fake Gh Exec — canned responses, no network
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
// Shared state factory
// ---------------------------------------------------------------------------

function makeState(
  overrides: Partial<BuildWorktreeState> = {},
): BuildWorktreeState {
  return {
    branch: "feat/test",
    baseBranch: "origin/main",
    repoRoot: "/tmp/repo",
    worktreePath: "/tmp/repo/.worktrees/feat-test",
    prNumber: null,
    runId: null,
    phase: "validating",
    task: "Add a test feature",
    validationIteration: 0,
    ciIteration: 0,
    failures: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test I/O collector
// ---------------------------------------------------------------------------

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
// Tests
// ---------------------------------------------------------------------------

describe("phasePushPR", () => {
  test("happy: pushes and creates PR, sets prNumber from URL", async () => {
    const exec = makeFakeGhExec({
      "git remote get-url origin": { stdout: "git@github.com:user/repo.git" },
      "git fetch origin": { stdout: "" },
      "git push -u origin": { stdout: "Everything up-to-date" },
      "gh pr create": {
        stdout: "https://github.com/user/repo/pull/42",
      },
    });
    const state = makeState();
    const { io } = makeTestIo();

    await phasePushPR(exec, state, io);

    expect(state.prNumber).toBe(42);
    expect(state.phase).toBe("pushed");
  });

  test("throws NO_REMOTE when remote check fails", async () => {
    const exec = makeFakeGhExec({
      "git remote get-url origin": {
        stdout: "",
        stderr: "fatal: not a git repository",
        exitCode: 128,
      },
    });
    const state = makeState();
    const { io } = makeTestIo();

    await expect(phasePushPR(exec, state, io)).rejects.toThrow("NO_REMOTE");
    // State unchanged
    expect(state.prNumber).toBeNull();
    expect(state.phase).toBe("validating");
  });

  test("throws PUSH_AUTH_FAILURE on permission error", async () => {
    const exec = makeFakeGhExec({
      "git remote get-url origin": { stdout: "git@github.com:user/repo.git" },

      "git fetch origin": { stdout: "" },
      "git push -u origin": {
        stdout: "",
        stderr:
          "ERROR: Permission denied (publickey).\nfatal: Could not read from remote repository.",
        exitCode: 128,
      },
    });
    const state = makeState();
    const { io } = makeTestIo();

    await expect(phasePushPR(exec, state, io)).rejects.toThrow(
      "PUSH_AUTH_FAILURE",
    );
  });

  test("throws PUSH_FAILED on non-auth push error", async () => {
    const exec = makeFakeGhExec({
      "git remote get-url origin": { stdout: "git@github.com:user/repo.git" },
      "git fetch origin": { stdout: "" },
      "git push -u origin": {
        stdout: "",
        stderr: "src refspec does not match any",
        exitCode: 128,
      },
    });
    const state = makeState();
    const { io } = makeTestIo();

    await expect(phasePushPR(exec, state, io)).rejects.toThrow("PUSH_FAILED");
  });

  test("throws PR_CREATE_FAILED when gh pr create errors", async () => {
    const exec = makeFakeGhExec({
      "git remote get-url origin": { stdout: "git@github.com:user/repo.git" },

      "git fetch origin": { stdout: "" },
      "git push -u origin": { stdout: "Everything up-to-date" },
      "gh pr create": {
        stdout: "",
        stderr: "GraphQL: Base branch 'main' does not exist",
        exitCode: 1,
      },
    });
    const state = makeState();
    const { io } = makeTestIo();

    await expect(phasePushPR(exec, state, io)).rejects.toThrow(
      "PR_CREATE_FAILED",
    );
  });
});
