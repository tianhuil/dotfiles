import type { ExecFn, BuildWorktreeState } from "../types";
import { wtExec } from "../exec";

// ---------------------------------------------------------------------------
// Phase 2: Commit — stage all changes and commit
// ---------------------------------------------------------------------------

export async function commitInWorktree(
  exec: ExecFn,
  state: BuildWorktreeState,
  message: string,
): Promise<boolean> {
  const add = await wtExec(exec, state.worktreePath, "git add -A");
  if (add.exitCode !== 0) return false;

  // Check if anything staged
  const diff = await wtExec(
    exec,
    state.worktreePath,
    "git diff --cached --quiet",
  );
  if (diff.exitCode === 0) return false;

  const cmt = await wtExec(
    exec,
    state.worktreePath,
    `git commit -m "${message.replace(/"/g, '\\"')}"`,
  );
  return cmt.exitCode === 0;
}
