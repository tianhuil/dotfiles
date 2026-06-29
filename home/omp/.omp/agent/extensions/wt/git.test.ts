import { test, expect, describe } from "bun:test";
import { parseWorktreeList } from "./git";
import type { WorktreeEntry } from "./types";

// ──────────────────────────────────────────────────
// parseWorktreeList
// ──────────────────────────────────────────────────

describe("parseWorktreeList", () => {
  test("main repo entry (no branch line)", () => {
    const output = "worktree /Users/user/project\n";
    const result = parseWorktreeList(output);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<WorktreeEntry>({
      path: "/Users/user/project",
      branch: null,
    });
  });

  test("named branch entry with refs/heads/ stripped", () => {
    const output = [
      "worktree /Users/user/project",
      "branch refs/heads/my-feature",
    ].join("\n");
    const result = parseWorktreeList(output);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<WorktreeEntry>({
      path: "/Users/user/project",
      branch: "my-feature",
    });
  });

  test("detached HEAD entry (no branch line after worktree)", () => {
    const output = [
      "worktree /Users/user/project",
      "HEAD deadbeef1234567890abcdef1234567890abcdef",
    ].join("\n");
    const result = parseWorktreeList(output);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<WorktreeEntry>({
      path: "/Users/user/project",
      branch: null,
    });
  });

  test("multiple entries", () => {
    const output = [
      "worktree /Users/user/project",
      "branch refs/heads/main",
      "",
      "worktree /Users/user/project-feat",
      "branch refs/heads/feature-login",
      "",
      "worktree /tmp/detached-worktree",
    ].join("\n");
    const result = parseWorktreeList(output);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual<WorktreeEntry>({
      path: "/Users/user/project",
      branch: "main",
    });
    expect(result[1]).toEqual<WorktreeEntry>({
      path: "/Users/user/project-feat",
      branch: "feature-login",
    });
    expect(result[2]).toEqual<WorktreeEntry>({
      path: "/tmp/detached-worktree",
      branch: null,
    });
  });

  test("empty string returns empty array", () => {
    const result = parseWorktreeList("");
    expect(result).toEqual([]);
  });

  test("branch ref that does not match refs/heads/ pattern is kept as-is", () => {
    const output = [
      "worktree /Users/user/project",
      "branch refs/remotes/origin/feature",
    ].join("\n");
    const result = parseWorktreeList(output);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<WorktreeEntry>({
      path: "/Users/user/project",
      branch: "refs/remotes/origin/feature",
    });
  });
});
