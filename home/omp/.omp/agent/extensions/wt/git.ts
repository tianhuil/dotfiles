import type { ExecFn, WorktreeEntry } from "./types";

// ---------------------------------------------------------------------------
// Shared git helpers — unified from wt-build + wt-clean
// ---------------------------------------------------------------------------

/**
 * Detect the default/base branch from the remote HEAD.
 * Returns { ref: "origin/main", name: "main" }.
 * Falls back to "origin/main" / "main" when detection fails.
 */
export async function detectBaseBranch(
  exec: ExecFn,
): Promise<{ ref: string; name: string }> {
  const r = await exec("git symbolic-ref refs/remotes/origin/HEAD --short");
  if (r.exitCode === 0) {
    const ref = r.stdout.trim();
    const name = ref.replace(/^origin\//, "");
    return { ref, name: name || "main" };
  }
  return { ref: "origin/main", name: "main" };
}

/**
 * Parse `git worktree list --porcelain` output into structured entries.
 */
export function parseWorktreeList(output: string): WorktreeEntry[] {
  const entries: WorktreeEntry[] = [];
  let current: Partial<WorktreeEntry> | null = null;

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current && current.path) {
        entries.push(current as WorktreeEntry);
      }
      current = { path: line.slice(9).trim(), branch: null };
    } else if (line.startsWith("branch ") && current) {
      // branch refs/heads/<name>  →  keep just <name>
      const ref = line.slice(7).trim();
      const m = ref.match(/^refs\/heads\/(.+)$/);
      current.branch = m ? m[1] : ref;
    }
  }
  if (current && current.path) {
    entries.push(current as WorktreeEntry);
  }
  return entries;
}

/**
 * List branches merged to the given reference.
 */
export async function listMergedBranches(
  exec: ExecFn,
  ref: string,
): Promise<Set<string>> {
  const merged = new Set<string>();
  const r = await exec(`git branch --merged ${ref}`);
  if (r.exitCode === 0) {
    for (const line of r.stdout.trim().split("\n")) {
      const b = line.trim().replace(/^[*+]\s*/, "");
      if (b) merged.add(b);
    }
  }
  return merged;
}
