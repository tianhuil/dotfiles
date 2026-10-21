import type { ExtensionAPI, InputEvent, TurnEndEvent } from "@earendil-works/pi-coding-agent";

// Detects when ~400K characters have been emitted since the last user request
// and injects a steering message to pull focus back.
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
  const charThreshold = resolveThreshold();
  let emittedChars = 0;
  let guardActive = true;

  pi.on("input", (event: InputEvent) => {
    // The guard's own steering message is extension input, not new user work.
    if (event.source === "extension") return;
    emittedChars = 0;
    guardActive = true;
  });

  pi.on("turn_end", (event: TurnEndEvent) => {
    if (!guardActive || event.message.role !== "assistant") return;

    for (const part of event.message.content) {
      if (part.type === "text") emittedChars += part.text.length;
      else if (part.type === "thinking") emittedChars += part.thinking.length;
    }

    if (emittedChars < charThreshold) return;

    guardActive = false;
    emittedChars = 0;
    pi.sendUserMessage(
      "【Yak Shaving Guard】Look at user request. Are you yak shaving?",
      { deliverAs: "steer" },
    );
  });
}
