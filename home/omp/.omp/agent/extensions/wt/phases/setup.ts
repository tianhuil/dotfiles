import type { ExecFn, BuildWorktreeState } from "../types";
import { detectBaseBranch } from "../git";
import { buildBranchName } from "../branch";

// ---------------------------------------------------------------------------
// Phase 0: Setup — create worktree, determine branch name
// ---------------------------------------------------------------------------

export async function phaseSetup(
  exec: ExecFn,
  task: string,
  ctx: { ui: { notify: (msg: string, type?: "info" | "warning" | "error") => void } },
): Promise<BuildWorktreeState> {
  ctx.ui.notify("Setting up worktree...", "info");

  // Determine base branch from remote HEAD
  const base = await detectBaseBranch(exec);
  const baseBranch = base.ref;

  const fetchResult = await exec("git fetch -q origin");
  if (fetchResult.exitCode !== 0) {
    ctx.ui.notify(
      `git fetch failed: ${(fetchResult.stderr || fetchResult.stdout).trim() || "(no output)"}`,
      "warning",
    );
  }

  // Derive branch name, handle collisions with -v2, -v3, ...
  const desired = buildBranchName(task);
  let branch = desired;
  let suffix = 2;
  const localBranchExists = async (b: string) => {
    const r = await exec(`git show-ref --verify --quiet refs/heads/${b}`);
    return r.exitCode === 0;
  };
  while (await localBranchExists(branch)) {
    branch = `${desired}-v${suffix}`;
    suffix++;
  }

  // Discover repo root
  const rootResult = await exec("git rev-parse --show-toplevel");
  if (rootResult.exitCode !== 0) {
    ctx.ui.notify("Not in a git repository — can't create worktree", "error");
    throw new Error("NOT_A_GIT_REPO");
  }
  const repoRoot = rootResult.stdout.trim();

  // Create worktree at <repo-root>/.worktrees/<branch-slug>
  const slug = branch.replace(/\//g, "-");
  const worktreePath = `${repoRoot}/.worktrees/${slug}`;
  await exec(`mkdir -p ${repoRoot}/.worktrees`);

  // Try to create worktree tracking a remote branch; fall back to HEAD
  const baseRef = baseBranch.replace(/^origin\//, "");
  let wtCmd = `git worktree add --track -b ${branch} ${worktreePath} origin/${baseRef}`;
  let wtResult = await exec(wtCmd);

  if (wtResult.exitCode !== 0) {
    // If tracking failed (no remote), create based on HEAD
    ctx.ui.notify(
      "Remote tracking branch not found, creating worktree from HEAD",
      "info",
    );
    wtCmd = `git worktree add -b ${branch} ${worktreePath} HEAD`;
    wtResult = await exec(wtCmd);
  }

  if (wtResult.exitCode !== 0) {
    ctx.ui.notify(
      `Worktree creation failed: ${wtResult.stderr || wtResult.stdout}`,
      "error",
    );
    throw new Error(`Worktree creation failed: ${wtResult.stderr}`);
  }

  ctx.ui.notify(
    `Worktree ready: ${worktreePath} (branch: ${branch})`,
    "info",
  );

  const state: BuildWorktreeState = {
    branch,
    baseBranch,
    worktreePath,
    repoRoot,
    prNumber: null,
    runId: null,
    phase: "setup",
    task,
    validationIteration: 0,
    ciIteration: 0,
    failures: [],
  };

  return state;
}
