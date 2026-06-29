import type { ExtensionAPI, TurnEndEvent } from "@oh-my-pi/pi-coding-agent";

// ---------------------------------------------------------------------------
// Yak Shaving Guard — detects when ~400K characters have been emitted since
// the last user request and injects a steering message to pull focus back.
//
// Threshold: YAK_SHAVING_CHAR_THRESHOLD env var, or 400_000 by default.
// ---------------------------------------------------------------------------

const DEFAULT_CHAR_THRESHOLD = 400_000;

function resolveThreshold(): number {
  const raw = process.env.YAK_SHAVING_CHAR_THRESHOLD;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_CHAR_THRESHOLD;
}

export default function yakShavingGuardExtension(pi: ExtensionAPI) {
  const CHAR_THRESHOLD = resolveThreshold();
  let emittedChars = 0;
  let guardActive = true;

  // Reset the counter on every user input.
  pi.on("input", () => {
    emittedChars = 0;
    guardActive = true;
  });

  // Accumulate output characters after each assistant turn.
  pi.on("turn_end", (event: TurnEndEvent) => {
    if (!guardActive) return;

    const { message } = event;
    if (message.role !== "assistant") return;

    let chars = 0;
    for (const part of message.content) {
      if (part.type === "text") {
        chars += part.text.length;
      } else if (part.type === "thinking") {
        chars += part.thinking.length;
      }
    }

    emittedChars += chars;

    if (emittedChars >= CHAR_THRESHOLD) {
      // Prevent re-triggering until next user input resets the counter.
      guardActive = false;
      emittedChars = 0;

      pi.sendUserMessage(
        "【Yak Shaving Guard】Look at user request. Are you yak shaving?",
        { deliverAs: "steer" },
      );
    }
  });
}
