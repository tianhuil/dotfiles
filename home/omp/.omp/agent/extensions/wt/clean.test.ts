import { test, expect, describe, afterEach } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runClean } from "./clean";
import { createExec } from "./exec";
import type { ExecFn, IoSink } from "./types";

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

/** Run a git command inside repoDir, throwing on failure. */
function git(repoDir: string, ...args: string[]): void {
  const r = Bun.spawnSync(["git", ...args], { cwd: repoDir });
  if (r.exitCode !== 0) {
    throw new Error(
      `git ${args.join(" ")} exited ${r.exitCode}: ${r.stderr.toString().trim()}`,
    );
  }
}

/** Build a mock IoSink that captures notifications for assertions. */
function makeTestIo(): {
  io: IoSink;
  notifications: { msg: string; kind: string }[];
} {
  const notifications: { msg: string; kind: string }[] = [];
  return {
    io: {
      notify(msg: string, kind: "info" | "warning" | "error") {
        notifications.push({ msg, kind });
      },
      log() {},
    } satisfies IoSink,
    notifications,
  };
}

/**
 * Wrap createExec so every command runs inside repoDir.
 * (runClean's git commands need to execute from the repo root.)
 */
function makeRepoExec(repoDir: string): ExecFn {
  const exec = createExec();
  return (cmd: string) => exec(`cd "${repoDir}" && ${cmd}`);
}

// ──────────────────────────────────────────────────
// Fixtures  (build real git repos on disk)
// ──────────────────────────────────────────────────

interface FixtureResult {
  repoDir: string;
  exec: ExecFn;
}

/**
 * Create a repo with a mix of merged and unmerged worktree branches:
 *   main ──── feature-merged (merged into main)
 *        └─── feature-one    (unmerged — has commit ahead of main)
 *        └─── feature-two    (unmerged — has commit ahead of main)
 *        └─── detached HEAD  (no branch)
 */
function makeMergedWorktreeRepo(dir: string): FixtureResult {
  git(dir, "init", "-b", "main");
  git(dir, "config", "user.email", "test@test.com");
  git(dir, "config", "user.name", "Test User");

  // Initial commit on main
  writeFileSync(join(dir, "README.md"), "# Test Repo\n");
  git(dir, "add", "README.md");
  git(dir, "commit", "-m", "initial commit");

  // ── feature-merged (will be merged) ──
  git(dir, "checkout", "-b", "feature-merged");
  writeFileSync(join(dir, "fm.txt"), "merged content\n");
  git(dir, "add", "fm.txt");
  git(dir, "commit", "-m", "feature-merged commit");

  git(dir, "checkout", "main");
  git(dir, "merge", "feature-merged", "-m", "merge feature-merged");

  // ── feature-one (unmerged — own commit) ──
  git(dir, "checkout", "-b", "feature-one");
  writeFileSync(join(dir, "f1.txt"), "feature one\n");
  git(dir, "add", "f1.txt");
  git(dir, "commit", "-m", "feature-one commit");

  git(dir, "checkout", "main");

  // ── feature-two (unmerged — own commit) ──
  git(dir, "checkout", "-b", "feature-two");
  writeFileSync(join(dir, "f2.txt"), "feature two\n");
  git(dir, "add", "f2.txt");
  git(dir, "commit", "-m", "feature-two commit");

  git(dir, "checkout", "main");

  // ── Add worktrees ──
  git(
    dir,
    "worktree",
    "add",
    join(dir, ".worktrees", "feature-one"),
    "feature-one",
  );
  git(
    dir,
    "worktree",
    "add",
    join(dir, ".worktrees", "feature-merged"),
    "feature-merged",
  );
  git(dir, "worktree", "add", "--detach", join(dir, ".worktrees", "detached"));

  return { repoDir: dir, exec: makeRepoExec(dir) };
}

/** Bare repo: initial commit + no worktrees. */
function makeCleanRepo(dir: string): FixtureResult {
  git(dir, "init", "-b", "main");
  git(dir, "config", "user.email", "test@test.com");
  git(dir, "config", "user.name", "Test User");
  writeFileSync(join(dir, "README.md"), "# Test Repo\n");
  git(dir, "add", "README.md");
  git(dir, "commit", "-m", "initial commit");
  return { repoDir: dir, exec: makeRepoExec(dir) };
}

/** Repo with a single unmerged worktree branch (nothing to clean). */
function makeUnmergedWorktreeRepo(dir: string): FixtureResult {
  git(dir, "init", "-b", "main");
  git(dir, "config", "user.email", "test@test.com");
  git(dir, "config", "user.name", "Test User");
  writeFileSync(join(dir, "README.md"), "# Test Repo\n");
  git(dir, "add", "README.md");
  git(dir, "commit", "-m", "initial commit");

  // Branch that is NOT merged to main
  git(dir, "checkout", "-b", "dev-feature");
  writeFileSync(join(dir, "dev.txt"), "unmerged\n");
  git(dir, "add", "dev.txt");
  git(dir, "commit", "-m", "dev-feature commit");

  git(dir, "checkout", "main");
  git(
    dir,
    "worktree",
    "add",
    join(dir, ".worktrees", "dev-feature"),
    "dev-feature",
  );

  return { repoDir: dir, exec: makeRepoExec(dir) };
}

// ──────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────

const tempDirs: string[] = [];

function createTemp<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "wt-clean-test-"));
  tempDirs.push(dir);
  return fn(dir);
}

afterEach(() => {
  for (const d of tempDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
  tempDirs.length = 0;
});

// ──────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────

describe("runClean", () => {
  test("merged branch worktree is removed; unmerged worktree kept", async () => {
    const { repoDir, exec } = createTemp(makeMergedWorktreeRepo);
    const { io, notifications } = makeTestIo();

    // Sanity-check: both exist before clean
    expect(
      existsSync(join(repoDir, ".worktrees", "feature-merged")),
    ).toBeTrue();
    expect(
      existsSync(join(repoDir, ".worktrees", "feature-one")),
    ).toBeTrue();

    await runClean({ exec, io });

    // Merged worktree gone
    expect(
      existsSync(join(repoDir, ".worktrees", "feature-merged")),
    ).toBeFalse();

    // Unmerged worktree still present
    expect(
      existsSync(join(repoDir, ".worktrees", "feature-one")),
    ).toBeTrue();

    // Report mentions the removal
    const text = notifications.map((n) => n.msg).join("\n");
    expect(text).toMatch(/Removed.*worktree/);
    expect(text).toMatch(/feature-merged/);
  });

  test("unmerged branch worktree kept with 'not merged' reason", async () => {
    const { repoDir, exec } = createTemp(makeMergedWorktreeRepo);
    const { io, notifications } = makeTestIo();

    await runClean({ exec, io });

    // Still on disk
    expect(
      existsSync(join(repoDir, ".worktrees", "feature-one")),
    ).toBeTrue();

    // Report says not merged
    const text = notifications.map((n) => n.msg).join("\n");
    expect(text).toMatch(/not merged to main/);
  });

  test("main repo worktree (the .git dir itself) appears in kept", async () => {
    const { repoDir, exec } = createTemp(makeMergedWorktreeRepo);
    const { io, notifications } = makeTestIo();

    await runClean({ exec, io });

    // The main worktree entry (repoDir itself) must show up in the kept
    // section — either as "not a named branch worktree" or
    // "is the main branch worktree".
    const text = notifications.map((n) => n.msg).join("\n");
    expect(text).toMatch(repoDir);
  });

  test("detached HEAD worktree is kept", async () => {
    const { repoDir, exec } = createTemp(makeMergedWorktreeRepo);
    const { io, notifications } = makeTestIo();

    await runClean({ exec, io });

    // Detached worktree still on disk
    expect(
      existsSync(join(repoDir, ".worktrees", "detached")),
    ).toBeTrue();

    // Reason should say "not a named branch worktree" (or similar)
    const text = notifications.map((n) => n.msg).join("\n");
    expect(text).toMatch(/not a named branch worktree/);
  });

  test("nothing to clean when all worktree branches are unmerged", async () => {
    const { repoDir, exec } = createTemp(makeUnmergedWorktreeRepo);
    const { io, notifications } = makeTestIo();

    await runClean({ exec, io });

    // Worktree directory untouched
    expect(
      existsSync(join(repoDir, ".worktrees", "dev-feature")),
    ).toBeTrue();

    const text = notifications.map((n) => n.msg).join("\n");
    // No "Removed N worktree(s)" line with N > 0
    expect(text).not.toMatch(/Removed [1-9]/);
    // But should show kept notification
    expect(text).toMatch(/Kept/);
  });

  test("no worktrees at all — only the main repo entry exists", async () => {
    const { repoDir, exec } = createTemp(makeCleanRepo);
    const { io, notifications } = makeTestIo();

    await runClean({ exec, io });

    // The main repo always appears in git worktree list; nothing removed.
    const text = notifications.map((n) => n.msg).join("\n");
    expect(text).not.toMatch(/Removed/);
    expect(text).toMatch(/Kept/);
    // repo dir still exists (no aberrant removal)
    expect(existsSync(repoDir)).toBeTrue();
  });
});
