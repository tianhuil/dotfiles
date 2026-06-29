import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@oh-my-pi/pi-coding-agent";
import { createExec } from "./exec";
import { makeAiDriver } from "./ai";
import { makeIoSink } from "./io";
import { recoverState } from "./state";
import { runClean } from "./clean";
import { phaseSetup } from "./phases/setup";
import { orchestrateBuild, orchestrateContinue } from "./orchestrate";

export default function wtExtension(pi: ExtensionAPI): void {
  pi.setLabel("WT");

  // ── /wt-build ──
  pi.registerCommand("wt-build", {
    description:
      "(extension) Build a feature in an isolated git worktree, validate locally, push a PR, and iterate until CI passes",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const noGh = args.includes("--no-gh");
      const task = args.replace("--no-gh", "").trim();
      if (!task) {
        ctx.ui.notify("Usage: /wt-build <task description>", "warning");
        return;
      }
      try {
        const exec = createExec();
        const ai = makeAiDriver(pi, ctx);
        const io = makeIoSink(ctx);
        const state = await phaseSetup(exec, task, ctx);
        await orchestrateBuild(exec, ai, state, { noGh }, io);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`WT build failed: ${msg}`, "error");
      }
    },
  });

  // ── /wt-continue ──
  pi.registerCommand("wt-continue", {
    description:
      "(extension) Continue work on an existing wt-build worktree",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const noGh = args.includes("--no-gh");
      const instructions = args.replace("--no-gh", "").trim();
      if (!instructions) {
        ctx.ui.notify("Usage: /wt-continue <follow-up instructions>", "warning");
        return;
      }
      try {
        const state = recoverState(ctx);
        if (!state) {
          ctx.ui.notify(
            "No previous wt-build found in this session. Run /wt-build first.",
            "warning",
          );
          return;
        }
        const exec = createExec();
        const exists = await exec(`test -d ${state.worktreePath}`);
        if (exists.exitCode !== 0) {
          ctx.ui.notify(
            `Worktree no longer exists: ${state.worktreePath}. Cannot continue.`,
            "error",
          );
          return;
        }
        ctx.ui.notify(
          `Continuing on ${state.branch} (worktree: ${state.worktreePath})`,
          "info",
        );
        state.validationIteration = 0;
        state.ciIteration = 0;
        state.failures = [];
        state.phase = "continuing";

        const ai = makeAiDriver(pi, ctx);
        const io = makeIoSink(ctx);
        await orchestrateContinue(exec, ai, state, instructions, { noGh }, io);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`WT continue failed: ${msg}`, "error");
      }
    },
  });

  // ── /wt-clean ──
  pi.registerCommand("wt-clean", {
    description:
      "(extension) Remove worktree dirs for branches merged to main — leaves branches intact",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const exec = createExec();
      const io = makeIoSink(ctx);
      await runClean({ exec, io });
    },
  });

  // ── Session resume: detect stale worktree and notify ──
  pi.on("session_start", async (_event: unknown, ctx: ExtensionContext) => {
    const state = recoverState(ctx);
    if (state && state.phase !== "done") {
      ctx.ui.notify(
        `Incomplete wt-build found: ${state.branch} (phase: ${state.phase}). Worktree: ${state.worktreePath}`,
        "warning",
      );
    }
  });
}

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
