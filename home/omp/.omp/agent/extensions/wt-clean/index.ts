import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@oh-my-pi/pi-coding-agent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface WorktreeEntry {
  path: string;
  branch: string | null; // null when detached HEAD
}

// ---------------------------------------------------------------------------
// Exec wrapper (mirrors wt-build)
// ---------------------------------------------------------------------------

function createExec(): (command: string) => Promise<ExecResult> {
  return async function execCommand(
    command: string,
  ): Promise<ExecResult> {
    try {
      const proc = Bun.spawn(["sh", "-c", command]);
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      await proc.exited;
      return {
        stdout,
        stderr,
        exitCode: proc.exitCode,
      };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "exitCode" in err) {
        const e = err as {
          stdout?: unknown;
          stderr?: unknown;
          exitCode?: unknown;
        };
        return {
          stdout:
            e.stdout instanceof Buffer
              ? e.stdout.toString()
              : String(e.stdout ?? ""),
          stderr:
            e.stderr instanceof Buffer
              ? e.stderr.toString()
              : String(e.stderr ?? ""),
          exitCode: typeof e.exitCode === "number" ? e.exitCode : 1,
        };
      }
      return {
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Git porcelain parser
// ---------------------------------------------------------------------------

function parseWorktreeList(output: string): WorktreeEntry[] {
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

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function wtCleanExtension(pi: ExtensionAPI): void {
  pi.setLabel("WT Clean");

  pi.registerCommand("wt-clean", {
    description:
      "(extension) Remove worktree dirs for branches merged to main — leaves branches intact",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const exec = createExec();

      // 1. Determine default branch from remote HEAD
      let mainBranch = "main";
      {
        const r = await exec(
          "git symbolic-ref refs/remotes/origin/HEAD --short",
        );
        if (r.exitCode === 0) {
          const ref = r.stdout.trim().replace(/^origin\//, "");
          if (ref) mainBranch = ref;
        }
      }

      // 2. Fetch so origin/* refs are up to date
      ctx.ui.notify("Fetching from origin...", "info");
      await exec("git fetch -q origin");

      // 3. Compute set of branches merged to main (local main OR origin/<mainBranch>)
      const mergedBranches = new Set<string>();
      for (const ref of [mainBranch, `origin/${mainBranch}`]) {
        const r = await exec(`git branch --merged ${ref}`);
        if (r.exitCode === 0) {
          for (const line of r.stdout.trim().split("\n")) {
            const b = line.trim().replace(/^\*\s*/, "");
            if (b) mergedBranches.add(b);
          }
        }
      }

      // 4. Scan worktrees via porcelain format
      ctx.ui.notify("Scanning worktrees...", "info");
      const wtr = await exec("git worktree list --porcelain");
      if (wtr.exitCode !== 0) {
        ctx.ui.notify(
          `Failed to list worktrees: ${wtr.stderr || wtr.stdout}`,
          "error",
        );
        return;
      }

      const allWorktrees = parseWorktreeList(wtr.stdout);
      const removed: { branch: string; path: string }[] = [];
      const kept: { branch: string; path: string; reason: string }[] = [];

      for (const wt of allWorktrees) {
        // Skip the main-repo worktree (has no branch field in porcelain or is main/HEAD)
        // The main repo entry has no "branch" line in porcelain; detached also has no branch.
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
        lines.push(
          `\nKept ${kept.length} worktree(s):`,
        );
        for (const k of kept) {
          lines.push(`  • ${k.branch}  — ${k.reason}`);
          lines.push(`    ${k.path}`);
        }
      }
      if (removed.length === 0 && kept.length === 0) {
        lines.push("No git worktrees found.");
      }

      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
