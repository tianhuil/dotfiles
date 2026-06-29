import type { ExecFn, IoSink, WorktreeEntry } from "./types";
import { parseWorktreeList, listMergedBranches } from "./git";
import { detectBaseBranch } from "./git";

export interface CleanOptions {
  exec: ExecFn;
  io: IoSink;
}

/**
 * Remove worktree dirs for branches merged to main.
 * Leaves branches intact; only removes the working tree.
 */
export async function runClean({ exec, io }: CleanOptions): Promise<void> {
  // 1. Determine default branch from remote HEAD
  const { name: mainBranch } = await detectBaseBranch(exec);

  // 2. Fetch so origin/* refs are up to date
  io.notify("Fetching from origin...", "info");
  await exec("git fetch -q origin");

  // 3. Compute set of branches merged to main
  const mergedBranches = new Set<string>();
  for (const ref of [mainBranch, `origin/${mainBranch}`]) {
    const merged = await listMergedBranches(exec, ref);
    for (const b of merged) mergedBranches.add(b);
  }

  // 4. Scan worktrees via porcelain format
  io.notify("Scanning worktrees...", "info");
  const wtr = await exec("git worktree list --porcelain");
  if (wtr.exitCode !== 0) {
    io.notify(
      `Failed to list worktrees: ${wtr.stderr || wtr.stdout}`,
      "error",
    );
    return;
  }

  const allWorktrees: WorktreeEntry[] = parseWorktreeList(wtr.stdout);
  const removed: { branch: string; path: string }[] = [];
  const kept: { branch: string; path: string; reason: string }[] = [];

  for (const wt of allWorktrees) {
    // Skip the main-repo worktree (has no branch field in porcelain)
    if (!wt.branch) {
      kept.push({
        path: wt.path,
        branch: "(main repo or detached HEAD)",
        reason: "not a named branch worktree",
      });
      continue;
    }

    // Never touch the main branch's worktree
    if (wt.branch === mainBranch || wt.branch === `origin/${mainBranch}`) {
      kept.push({
        path: wt.path,
        branch: wt.branch,
        reason: "is the main branch worktree",
      });
      continue;
    }

    if (mergedBranches.has(wt.branch)) {
      const r = await exec(`git worktree remove "${wt.path}"`);
      if (r.exitCode === 0) {
        removed.push({ branch: wt.branch, path: wt.path });
      } else {
        kept.push({
          path: wt.path,
          branch: wt.branch,
          reason: `could not remove: ${r.stderr.trim()}`,
        });
      }
    } else {
      kept.push({
        path: wt.path,
        branch: wt.branch,
        reason: "not merged to main",
      });
    }
  }

  // 5. Report
  const lines: string[] = [];
  if (removed.length > 0) {
    lines.push(
      `Removed ${removed.length} worktree(s) (merged to ${mainBranch}):`,
    );
    for (const r of removed) {
      lines.push(`  ✓ ${r.branch}  (${r.path})`);
    }
  }
  if (kept.length > 0) {
    lines.push(`\nKept ${kept.length} worktree(s):`);
    for (const k of kept) {
      lines.push(`  • ${k.branch}  — ${k.reason}`);
      lines.push(`    ${k.path}`);
    }
  }
  if (removed.length === 0 && kept.length === 0) {
    lines.push("No git worktrees found.");
  }

  io.notify(lines.join("\n"), "info");
}
