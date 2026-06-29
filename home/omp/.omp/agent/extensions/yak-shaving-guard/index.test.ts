import { test, expect, describe, beforeEach } from "bun:test";
import yakShavingGuardExtension from "./index";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

// ---------------------------------------------------------------------------
// Test harness — provides a scripted ExtensionAPI that records interactions
// ---------------------------------------------------------------------------

type TurnEndHandler = (event: unknown) => void;

/** Set before each test to override the env-var threshold. */
let testCharThreshold: string | undefined;

const OrigEnv = process.env;

function createHarness() {
  // Snapshot env before each test
  const saved = process.env.YAK_SHAVING_CHAR_THRESHOLD;
  process.env.YAK_SHAVING_CHAR_THRESHOLD = testCharThreshold;

  const messages: string[] = [];
  const handlers = new Map<string, TurnEndHandler>();
  let inputHandler: (() => void) | null = null;

  const pi = {
    on: (event: string, handler: unknown) => {
      if (event === "input") {
        inputHandler = handler as () => void;
      } else if (event === "turn_end") {
        handlers.set("turn_end", handler as TurnEndHandler);
      }
    },
    sendUserMessage: (content: string) => {
      messages.push(content);
    },
  } satisfies Partial<ExtensionAPI>;

  yakShavingGuardExtension(pi as ExtensionAPI);

  process.env.YAK_SHAVING_CHAR_THRESHOLD = saved;

  return {
    userInput() {
      inputHandler?.();
    },
    assistantTurn(text: string, thinking = "") {
      const handler = handlers.get("turn_end");
      if (!handler) throw new Error("turn_end handler not registered");

      const content: Array<{ type: string; text?: string; thinking?: string }> = [];
      if (text) content.push({ type: "text", text });
      if (thinking) content.push({ type: "thinking", thinking });

      handler({
        turnIndex: 1,
        message: { role: "assistant", content },
        toolResults: [],
      });
    },
    userTurn() {
      const handler = handlers.get("turn_end");
      if (!handler) throw new Error("turn_end handler not registered");
      handler({
        turnIndex: 1,
        message: { role: "user", content: [{ type: "text", text: "hello" }] },
        toolResults: [],
      });
    },
    get messages() {
      return messages;
    },
  };
}

describe("yak-shaving-guard", () => {
  beforeEach(() => {
    testCharThreshold = undefined;
  });

  test("does not trigger below default threshold", () => {
    const h = createHarness();
    h.assistantTurn("hi");
    expect(h.messages).toEqual([]);
  });

  test("triggers after 400K chars of assistant output by default", () => {
    const h = createHarness();
    const chunk = "x".repeat(500);
    for (let i = 0; i < 800; i++) {
      h.assistantTurn(chunk);
    }
    expect(h.messages).toHaveLength(1);
    expect(h.messages[0]).toContain("Yak Shaving Guard");
  });

  test("does not trigger on user turns", () => {
    const h = createHarness();
    for (let i = 0; i < 2000; i++) {
      h.userTurn();
    }
    expect(h.messages).toEqual([]);
  });

  test("counts thinking + text combined", () => {
    const h = createHarness();
    // 250 text + 250 thinking = 500 chars per turn; 800 = 400K.
    for (let i = 0; i < 800; i++) {
      h.assistantTurn("x".repeat(250), "x".repeat(250));
    }
    expect(h.messages).toHaveLength(1);
  });

  test("resets counter on user input", () => {
    const h = createHarness();
    const chunk = "x".repeat(500);
    for (let i = 0; i < 400; i++) {
      h.assistantTurn(chunk);
    }
    expect(h.messages).toEqual([]);
    h.userInput();
    for (let i = 0; i < 400; i++) {
      h.assistantTurn(chunk);
    }
    expect(h.messages).toEqual([]);
  });

  test("does not re-trigger until next user input resets", () => {
    const h = createHarness();
    const chunk = "x".repeat(500);
    for (let i = 0; i < 900; i++) {
      h.assistantTurn(chunk);
    }
    expect(h.messages).toHaveLength(1);
    for (let i = 0; i < 900; i++) {
      h.assistantTurn(chunk);
    }
    expect(h.messages).toHaveLength(1);
    h.userInput();
    for (let i = 0; i < 900; i++) {
      h.assistantTurn(chunk);
    }
    expect(h.messages).toHaveLength(2);
  });

  test("triggers on exact boundary", () => {
    const h = createHarness();
    const chunk = "x".repeat(500);
    for (let i = 0; i < 799; i++) {
      h.assistantTurn(chunk);
    }
    expect(h.messages).toEqual([]);
    h.assistantTurn(chunk);
    expect(h.messages).toHaveLength(1);
  });

  test("honors YAK_SHAVING_CHAR_THRESHOLD env var", () => {
    testCharThreshold = "50";
    const h = createHarness();
    h.assistantTurn("x".repeat(49));
    expect(h.messages).toEqual([]);
    h.assistantTurn("x".repeat(1));
    expect(h.messages).toHaveLength(1);
  });

  test("ignores invalid env var value, falls back to default", () => {
    testCharThreshold = "not-a-number";
    const h = createHarness();
    // With invalid env, uses default 400K. 50 chars should not trigger.
    h.assistantTurn("x".repeat(50));
    expect(h.messages).toEqual([]);
  });
});
