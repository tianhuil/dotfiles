import type { ExtensionAPI, ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";
import type { AiDriver } from "./types";

// ---------------------------------------------------------------------------
// AiDriver factory — wraps sendMessage+waitForIdle into a simple function
// ---------------------------------------------------------------------------

export function makeAiDriver(pi: ExtensionAPI, ctx: ExtensionCommandContext): AiDriver {
  return async (prompt: string): Promise<void> => {
    await ctx.waitForIdle();
    pi.sendMessage(
      { customType: "wt-build", content: prompt, display: true },
      { deliverAs: "steer", triggerTurn: true },
    );
    await ctx.waitForIdle();
  };
}
