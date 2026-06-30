import { test, expect, describe, afterEach } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import {
  discoverValidationCommands,
  phaseValidate,
  phaseValidateLoop,
} from "./validate";
import { createExec } from "../exec";
import type { AiDriver, BuildWorktreeState, IoSink } from "../types";

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

interface TestRepo {
  dir: string;
  worktreePath: string;
}

/** Run a git command inside repoDir, throwing on failure. */
function git(repoDir: string, ...args: string[]): void {
  execSync(`git ${args.join(" ")}`, { cwd: repoDir, encoding: "utf-8" });
}

/** Create a temp git repo with package.json scripts. */
function createTestRepo(scripts: Record<string, string> = {}): TestRepo & { cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "validate-test-"));
  tempDirs.push(dir);
  execSync("git init -b main", { cwd: dir });
  git(dir, "config user.email test@test.com");
  git(dir, "config user.name Test User");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "test", scripts }),
  );
  git(dir, "add -A");
  git(dir, "commit -m initial");
  return {
    dir,
    worktreePath: dir,
    cleanup: () => {
      const idx = tempDirs.indexOf(dir);
      if (idx >= 0) tempDirs.splice(idx, 1);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Create a main repo + git worktree for loop tests. */
function createWorktreeRepo(
  scripts: Record<string, string> = { test: "exit 0" },
): { dir: string; state: BuildWorktreeState; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "validate-loop-"));
  tempDirs.push(dir);
  execSync("git init -b main", { cwd: dir });
  git(dir, "config user.email test@test.com");
  git(dir, "config user.name Test User");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "test", scripts }),
  );
  git(dir, "add -A");
  git(dir, "commit -m initial");

  // Create worktree
  const wt = join(dir, ".worktrees", "feat-test");
  execSync(`git worktree add -b feat/test ${wt} HEAD`, { cwd: dir });

  // Leave an untracked file so commitInWorktree has something to stage
  writeFileSync(join(wt, "feature.txt"), "initial\n");
  const state: BuildWorktreeState = {
    branch: "feat/test",
    baseBranch: "origin/main",
    repoRoot: dir,
    worktreePath: wt,
    prNumber: null,
    runId: null,
    phase: "setup",
    task: "test task",
    validationIteration: 0,
    ciIteration: 0,
    failures: [],
  };

  return {
    dir,
    state,
    cleanup: () => {
      const idx = tempDirs.indexOf(dir);
      if (idx >= 0) tempDirs.splice(idx, 1);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function makeTestIo(): { io: IoSink; notifications: Array<{ msg: string; kind: string }> } {
  const notifications: Array<{ msg: string; kind: string }> = [];
  return {
    io: {
      notify: (msg, kind) => {
        notifications.push({ msg, kind });
      },
      log: () => {},
    },
    notifications,
  };
}

// ──────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const d of tempDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // already cleaned up
    }
  }
  tempDirs.length = 0;
});

// ──────────────────────────────────────────────────
// discoverValidationCommands
// ──────────────────────────────────────────────────

describe("discoverValidationCommands", () => {
  test("empty repo (no package.json) returns empty array", async () => {
    // Create repo without a package.json
    const dir = mkdtempSync(join(tmpdir(), "validate-no-pkg-"));
    tempDirs.push(dir);
    execSync("git init -b main", { cwd: dir });
    git(dir, "config user.email test@test.com");
    git(dir, "config user.name Test User");

    const exec = createExec();
    const cmds = await discoverValidationCommands(exec, dir);
    expect(cmds).toEqual([]);
  });

  test("repo with only test and lint scripts", async () => {
    const { worktreePath, cleanup } = createTestRepo({
      test: "exit 0",
      lint: "exit 0",
    });
    try {
      const exec = createExec();
      const cmds = await discoverValidationCommands(exec, worktreePath);
      expect(cmds).toEqual(["bun run test", "bun run lint"]);
    } finally {
      cleanup();
    }
  });

  test("skips unknown scripts not in known list", async () => {
    const { worktreePath, cleanup } = createTestRepo({
      test: "exit 0",
      lint: "exit 0",
      notReal: "echo hi",
    });
    try {
      const exec = createExec();
      const cmds = await discoverValidationCommands(exec, worktreePath);
      expect(cmds).toEqual(["bun run test", "bun run lint"]);
    } finally {
      cleanup();
    }
  });

  test("returns all six known scripts when defined", async () => {
    const { worktreePath, cleanup } = createTestRepo({
      test: "exit 0",
      lint: "exit 0",
      typecheck: "exit 0",
      check: "exit 0",
      validate: "exit 0",
      format: "exit 0",
    });
    try {
      const exec = createExec();
      const cmds = await discoverValidationCommands(exec, worktreePath);
      expect(cmds).toEqual([
        "bun run test",
        "bun run lint",
        "bun run typecheck",
        "bun run check",
        "bun run validate",
        "bun run format",
      ]);
    } finally {
      cleanup();
    }
  });
});

// ──────────────────────────────────────────────────
// phaseValidate
// ──────────────────────────────────────────────────

describe("phaseValidate", () => {
  test("no validation commands found returns true", async () => {
    const { worktreePath, cleanup } = createTestRepo({});
    try {
      const exec = createExec();
      const { io } = makeTestIo();
      const state: BuildWorktreeState = {
        branch: "feat/test",
        baseBranch: "origin/main",
        repoRoot: "",
        worktreePath,
        prNumber: null,
        runId: null,
        phase: "validate",
        task: "test task",
        validationIteration: 0,
        ciIteration: 0,
        failures: [],
      };
      const result = await phaseValidate(exec, state, io);
      expect(result).toBe(true);
    } finally {
      cleanup();
    }
  });

  test("all commands pass returns true", async () => {
    const { worktreePath, cleanup } = createTestRepo({
      test: "exit 0",
      lint: "exit 0",
    });
    try {
      const exec = createExec();
      const { io } = makeTestIo();
      const state: BuildWorktreeState = {
        branch: "feat/test",
        baseBranch: "origin/main",
        repoRoot: "",
        worktreePath,
        prNumber: null,
        runId: null,
        phase: "validate",
        task: "test task",
        validationIteration: 0,
        ciIteration: 0,
        failures: [],
      };
      const result = await phaseValidate(exec, state, io);
      expect(result).toBe(true);
      expect(state.failures).toEqual([]);
    } finally {
      cleanup();
    }
  });

  test("one command fails returns false and collects failure", async () => {
    const { worktreePath, cleanup } = createTestRepo({
      test: "exit 1",
      lint: "exit 0",
    });
    try {
      const exec = createExec();
      const { io } = makeTestIo();
      const state: BuildWorktreeState = {
        branch: "feat/test",
        baseBranch: "origin/main",
        repoRoot: "",
        worktreePath,
        prNumber: null,
        runId: null,
        phase: "validate",
        task: "test task",
        validationIteration: 0,
        ciIteration: 0,
        failures: [],
      };
      const result = await phaseValidate(exec, state, io);
      expect(result).toBe(false);
      expect(state.failures.length).toBe(1);
      expect(state.failures[0]).toContain("Validation: bun run test");
    } finally {
      cleanup();
    }
  });
});

// ──────────────────────────────────────────────────
// phaseValidateLoop
// ──────────────────────────────────────────────────

describe("phaseValidateLoop", () => {
  test("scripted AI passes on first attempt", async () => {
    const { state, cleanup } = createWorktreeRepo({ test: "exit 0" });
    try {
      const exec = createExec();
      const { io } = makeTestIo();
      const ai: AiDriver = async () => {};

      const result = await phaseValidateLoop(exec, ai, state, io);
      expect(result).toBe(true);
      expect(state.validationIteration).toBe(1);
    } finally {
      cleanup();
    }
  });

  test("AI fixes failure and passes on retry", async () => {
    const { state, cleanup } = createWorktreeRepo({ test: "exit 1" });
    try {
      const exec = createExec();
      const { io } = makeTestIo();

      // Scripted AI: on first call, fix the package.json so test passes
      let aiCallCount = 0;
      const ai: AiDriver = async () => {
        aiCallCount++;
        writeFileSync(
          join(state.worktreePath, "package.json"),
          JSON.stringify({ name: "test", scripts: { test: "exit 0" } }),
        );
      };

      const result = await phaseValidateLoop(exec, ai, state, io);
      expect(result).toBe(true);
      expect(aiCallCount).toBe(1);
    } finally {
      cleanup();
    }
  });

  test("max iterations exceeded returns false", async () => {
    const { state, cleanup } = createWorktreeRepo({ test: "exit 1" });
    try {
      const exec = createExec();
      const { io } = makeTestIo();
      const ai: AiDriver = async () => {};

      const result = await phaseValidateLoop(exec, ai, state, io);
      expect(result).toBe(false);
      // validationIteration should be 5 after 5 failed attempts
      expect(state.validationIteration).toBe(5);
    } finally {
      cleanup();
    }
  });

  test("default max is 5 iterations", async () => {
    const { state, cleanup } = createWorktreeRepo({ test: "exit 1" });
    try {
      const exec = createExec();
      const { io } = makeTestIo();
      const callLog: number[] = [];
      const ai: AiDriver = async () => {
        callLog.push(state.validationIteration);
      };

      const result = await phaseValidateLoop(exec, ai, state, io);
      expect(result).toBe(false);
      // AI gets called 5 times (once per failing iteration)
      expect(callLog.length).toBe(5);
    } finally {
      cleanup();
    }
  });
});
