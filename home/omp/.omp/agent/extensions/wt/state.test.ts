import { test, expect, describe } from "bun:test";
import { STATE_TYPE, saveState, recoverState } from "./state";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

function mockPi(): ExtensionAPI & { recorded: unknown[] } {
  const recorded: unknown[] = [];
  return {
    recorded,
    appendEntry: (customType: string, data: unknown) => {
      recorded.push({ customType, data });
    },
    setLabel: () => {},
    registerCommand: () => {},
    on: () => {},
    sendMessage: () => {},
  } as unknown as ExtensionAPI & { recorded: unknown[] };
}

function mockCtx(
  entries: Array<{ type: string; customType: string; data: unknown }>,
): ExtensionContext {
  return {
    sessionManager: {
      getBranch: () => entries,
    },
  } as unknown as ExtensionContext;
}

// ──────────────────────────────────────────────────
// saveState
// ──────────────────────────────────────────────────

describe("saveState", () => {
  test("calls pi.appendEntry with STATE_TYPE and state data", () => {
    const pi = mockPi();
    const state = {
      branch: "feat/my-feature",
      baseBranch: "main",
      repoRoot: "/tmp/repo",
      worktreePath: "/tmp/repo-feat",
      prNumber: null,
      runId: null,
      phase: "build",
      task: "my task",
      validationIteration: 0,
      ciIteration: 0,
      failures: [],
    };

    saveState(pi, state);

    expect(pi.recorded).toHaveLength(1);
    expect(pi.recorded[0]).toEqual({
      customType: STATE_TYPE,
      data: state,
    });
  });
});

// ──────────────────────────────────────────────────
// recoverState
// ──────────────────────────────────────────────────

describe("recoverState", () => {
  const stateA = {
    branch: "feat/a",
    baseBranch: "main",
    repoRoot: "/tmp/a",
    worktreePath: "/tmp/a-wt",
    prNumber: null,
    runId: 1,
    phase: "build",
    task: "task a",
    validationIteration: 0,
    ciIteration: 0,
    failures: [],
  };

  const stateB = {
    branch: "feat/b",
    baseBranch: "main",
    repoRoot: "/tmp/b",
    worktreePath: "/tmp/b-wt",
    prNumber: null,
    runId: 2,
    phase: "build",
    task: "task b",
    validationIteration: 0,
    ciIteration: 0,
    failures: [],
  };

  test("returns latest entry with matching customType", () => {
    const ctx = mockCtx([
      { type: "custom", customType: "wt-build", data: stateA },
      { type: "custom", customType: "wt-build", data: stateB },
    ]);

    const result = recoverState(ctx);

    expect(result).toEqual(stateB);
  });

  test("returns null when no entries exist", () => {
    const ctx = mockCtx([]);

    const result = recoverState(ctx);

    expect(result).toBeNull();
  });

  test("skips entries with different customType", () => {
    const ctx = mockCtx([
      { type: "custom", customType: "other-type", data: stateA },
    ]);

    const result = recoverState(ctx);

    expect(result).toBeNull();
  });

  test("skips non-custom entries", () => {
    const ctx = mockCtx([
      { type: "message", customType: "", data: "hello" },
      { type: "custom", customType: "wt-build", data: stateA },
    ]);

    const result = recoverState(ctx);

    expect(result).toEqual(stateA);
  });
});
