import type { ExtensionAPI, ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";
import { createExec } from "./exec";
import { runClean } from "./clean";
import { makeIoSink } from "./io";

// Re-export types and utilities for consumers
export type {
  BuildWorktreeState,
  ExecResult,
  CIResult,
  ExecFn,
  AiDriver,
  IoSink,
  WorktreeEntry,
} from "./types";

export {
  createExec,
  wtExec,
} from "./exec";

export {
  saveState,
  recoverState,
  STATE_TYPE,
} from "./state";

export {
  slugify,
  inferBranchPrefix,
  buildBranchName,
} from "./branch";

export {
  detectBaseBranch,
  parseWorktreeList,
  listMergedBranches,
} from "./git";

export { makeIoSink } from "./io";

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function wtExtension(pi: ExtensionAPI): void {
  pi.setLabel("WT");

  // ── User command: /wt-clean ──────────────────────────────────────────
  pi.registerCommand("wt-clean", {
    description:
      "(extension) Remove worktree dirs for branches merged to main — leaves branches intact",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const exec = createExec();
      const io = makeIoSink(ctx);
      await runClean({ exec, io });
    },
  });
}
