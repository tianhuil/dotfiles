import type {
  ExtensionAPI,
  ExtensionContext,
} from "@oh-my-pi/pi-coding-agent";
import type { BuildWorktreeState } from "./types";

// Intentionally NOT renamed to "wt" — in-flight sessions reference "wt-build"
export const STATE_TYPE = "wt-build";

export function saveState(
  pi: ExtensionAPI,
  state: BuildWorktreeState,
): void {
  pi.appendEntry(STATE_TYPE, state);
}

export function recoverState(
  ctx: ExtensionContext,
): BuildWorktreeState | null {
  let latest: BuildWorktreeState | null = null;
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "custom" && entry.customType === STATE_TYPE) {
      latest = entry.data as BuildWorktreeState;
    }
  }
  return latest;
}
