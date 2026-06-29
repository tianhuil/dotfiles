import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { phaseSetup } from "./setup";
import { createExec } from "../exec";
import type { ExecFn } from "../types";

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

/** Build a mock ctx that captures notifications for assertions. */
function makeTestCtx(): {
  ctx: { ui: { notify: (msg: string, kind: string) => void } };
  notifications: Array<{ msg: string; kind: string }>;
} {
  const notifications: Array<{ msg: string; kind: string }> = [];
  const ctx = {
    ui: {
      notify: (msg: string, kind: string) => {
        notifications.push({ msg, kind });
      },
    },
  };
  return { ctx, notifications };
}

// ──────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────

const tempDirs: string[] = [];

/** Create a temp dir and resolve symlinks so paths match git rev-parse output. */
function createTemp<T>(fn: (dir: string) => T): T {
  const raw = mkdtempSync(join(tmpdir(), "wt-setup-"));
  const dir = realpathSync(raw);
  tempDirs.push(dir);
  return fn(dir);
}

afterEach(() => {
  for (const d of tempDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // Ignore — already cleaned by git worktree remove
    }
  }
  tempDirs.length = 0;
});

// ──────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────

describe("phaseSetup", () => {
  test("creates worktree at .worktrees/<slug> with correct branch name", async () => {
    await createTemp(async (repoDir) => {
      makeRepo(repoDir);
      const exec = createExec();
      const repoExec: ExecFn = (cmd: string) => exec(`cd "${repoDir}" && ${cmd}`);
      const { ctx } = makeTestCtx();

      const state = await phaseSetup(repoExec, "Add user authentication", ctx);

      expect(state.repoRoot).toBe(repoDir);
      expect(state.branch).toBe("feat/add-user-authentication");
      expect(state.worktreePath).toBe(
        join(repoDir, ".worktrees", "feat-add-user-authentication"),
      );
      expect(existsSync(state.worktreePath)).toBe(true);

      // Verify git worktree list includes it
      const list = execSync("git worktree list", {
        cwd: repoDir,
        encoding: "utf-8",
      });
      expect(list).toContain(state.worktreePath);
    });
  });

  test("existing branch appends -v2 suffix", async () => {
    await createTemp(async (repoDir) => {
      makeRepo(repoDir);
      // Pre-create the desired branch so phaseSetup picks -v2
      git(repoDir, "branch feat/add-user-authentication");

      const exec = createExec();
      const repoExec: ExecFn = (cmd: string) => exec(`cd "${repoDir}" && ${cmd}`);
      const { ctx } = makeTestCtx();

      const state = await phaseSetup(repoExec, "Add user authentication", ctx);

      expect(state.branch).toBe("feat/add-user-authentication-v2");
      expect(state.worktreePath).toBe(
        join(repoDir, ".worktrees", "feat-add-user-authentication-v2"),
      );
      expect(existsSync(state.worktreePath)).toBe(true);
    });
  });

  test("no origin remote falls back to HEAD", async () => {
    await createTemp(async (repoDir) => {
      makeRepo(repoDir);
      // No origin remote configured — detectBaseBranch returns fallback,
      // git fetch -q origin fails silently, worktree add --track fails,
      // then HEAD fallback succeeds.
      const exec = createExec();
      const repoExec: ExecFn = (cmd: string) => exec(`cd "${repoDir}" && ${cmd}`);
      const { ctx } = makeTestCtx();

      const state = await phaseSetup(repoExec, "Fix login crash", ctx);

      expect(state.branch).toBe("fix/fix-login-crash");
      expect(state.baseBranch).toBe("origin/main");
      expect(existsSync(state.worktreePath)).toBe(true);
    });
  });
});
