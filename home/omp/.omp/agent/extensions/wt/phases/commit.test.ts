import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { commitInWorktree } from "./commit";
import { createExec } from "../exec";
import type { ExecFn, BuildWorktreeState } from "../types";

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

/** Run a git command inside repoDir, throwing on failure. */
function git(repoDir: string, ...args: string[]): void {
  execSync(`git ${args.join(" ")}`, { cwd: repoDir, encoding: "utf-8" });
}

/** Init a bare repo with one initial commit. */
function makeRepo(dir: string): void {
  execSync("git init -b main", { cwd: dir });
  git(dir, "config user.email test@test.com");
  git(dir, "config user.name Test User");
  writeFileSync(join(dir, "README.md"), "# Test\n");
  git(dir, "add -A");
  git(dir, "commit -m initial");
}

/** Build a minimal state pointing at repoDir as both repoRoot and worktreePath. */
function makeState(worktreePath: string, repoRoot: string): BuildWorktreeState {
  return {
    branch: "feat/test",
    baseBranch: "origin/main",
    repoRoot,
    worktreePath,
    prNumber: null,
    runId: null,
    phase: "setup",
    task: "test",
    validationIteration: 0,
    ciIteration: 0,
    failures: [],
  };
}

// ──────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────

const tempDirs: string[] = [];

function createTemp<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "wt-commit-"));
  tempDirs.push(dir);
  return fn(dir);
}

afterEach(() => {
  for (const d of tempDirs) {
    rmSync(d, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

// ──────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────

describe("commitInWorktree", () => {
  test("nothing to commit returns false", async () => {
    await createTemp(async (repoDir) => {
      makeRepo(repoDir);
      const exec = createExec();
      const state = makeState(repoDir, repoDir);

      const result = await commitInWorktree(exec, state, "test message");

      expect(result).toBe(false);

      // No new commit
      const log = execSync("git log --oneline", {
        cwd: repoDir,
        encoding: "utf-8",
      });
      expect(log.trim().split("\n")).toHaveLength(1);
    });
  });

  test("happy path — add file and commit returns true", async () => {
    await createTemp(async (repoDir) => {
      makeRepo(repoDir);
      const exec = createExec();
      const state = makeState(repoDir, repoDir);

      writeFileSync(join(repoDir, "newfile.txt"), "hello\n");
      const result = await commitInWorktree(exec, state, "add new file");

      expect(result).toBe(true);

      // Verify commit message
      const subject = execSync("git log -1 --format=%s", {
        cwd: repoDir,
        encoding: "utf-8",
      }).trim();
      expect(subject).toBe("add new file");
    });
  });

  test("embedded quotes in message escaped correctly", async () => {
    await createTemp(async (repoDir) => {
      makeRepo(repoDir);
      const exec = createExec();
      const state = makeState(repoDir, repoDir);

      writeFileSync(join(repoDir, "quoted.txt"), "data\n");
      const result = await commitInWorktree(
        exec,
        state,
        'he said "hello world"',
      );

      expect(result).toBe(true);

      const subject = execSync("git log -1 --format=%s", {
        cwd: repoDir,
        encoding: "utf-8",
      }).trim();
      expect(subject).toBe('he said "hello world"');
    });
  });
});
