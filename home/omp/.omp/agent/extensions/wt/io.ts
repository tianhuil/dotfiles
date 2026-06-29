import type { ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";
import type { IoSink } from "./types";

export function makeIoSink(ctx: ExtensionCommandContext): IoSink {
  return {
    notify: (msg: string, kind: "info" | "warning" | "error") => {
      ctx.ui.notify(msg, kind);
    },
    log: (_msg: string) => {
      // no-op by default; could be extended for file logging
    },
  };
}
