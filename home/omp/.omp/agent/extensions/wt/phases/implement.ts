import type { AiDriver, BuildWorktreeState } from "../types";

// ---------------------------------------------------------------------------
// Phase 1: AI implementation — send task to AI and wait for completion
// ---------------------------------------------------------------------------

export async function phaseImplement(
  ai: AiDriver,
  state: BuildWorktreeState,
  round: number,
  fixInstructions?: string,
): Promise<void> {
  const prompt =
    round === 0
      ? [
          `## Build task`,
          ``,
          state.task,
          ``,
          `## Worktree`,
          ``,
          `All work must be done inside this worktree directory: \`${state.worktreePath}\``,
          `Use \`cd ${state.worktreePath}\` before any file operation or command.`,
          `Do NOT commit changes — I will commit for you.`,
          `Do NOT leave the worktree to modify files in the main repository.`,
        ].join("\n")
      : [
          `## Fix validation / CI issues`,
          ``,
          fixInstructions ?? "Fix the above issues in the worktree.",
          ``,
          `Worktree: \`${state.worktreePath}\``,
          `Use \`cd ${state.worktreePath}\` before any file operation or command.`,
          `Do NOT commit changes.`,
          `Do NOT leave the worktree.`,
        ].join("\n");

  await ai(prompt);
}

// ---------------------------------------------------------------------------
// Phase 1 (continue): AI implements follow-up instructions on existing worktree
// ---------------------------------------------------------------------------

export async function phaseImplementContinue(
  ai: AiDriver,
  state: BuildWorktreeState,
  instructions: string,
): Promise<void> {
  const prompt = [
    `## Follow-up task on existing worktree`,
    ``,
    instructions,
    ``,
    `## Context`,
    ``,
    `This builds on an existing feature in worktree: \`${state.worktreePath}\``,
    `Branch: \`${state.branch}\` (PR #${state.prNumber ?? "unknown"} is already open).`,
    `You MAY modify existing files — this is a follow-up, not a fresh build.`,
    ``,
    `Use \`cd ${state.worktreePath}\` before any file operation or command.`,
    `Do NOT commit changes — I will commit for you.`,
    `Do NOT leave the worktree to modify files in the main repository.`,
  ].join("\n");

  await ai(prompt);
}
