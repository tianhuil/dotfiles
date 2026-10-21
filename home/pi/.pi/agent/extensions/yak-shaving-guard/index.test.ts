import { beforeEach, describe, expect, test } from "bun:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import yakShavingGuardExtension from "./index";

type TurnEndHandler = (event: unknown) => void;

let testCharThreshold: string | undefined;

function createHarness() {
  const saved = process.env.YAK_SHAVING_CHAR_THRESHOLD;
  if (testCharThreshold === undefined) delete process.env.YAK_SHAVING_CHAR_THRESHOLD;
  else process.env.YAK_SHAVING_CHAR_THRESHOLD = testCharThreshold;

  const messages: string[] = [];
  const handlers = new Map<string, TurnEndHandler>();
  let inputHandler: ((event?: unknown) => void) | null = null;

  const pi = {
    on: (event: string, handler: unknown) => {
      if (event === "input") inputHandler = handler as () => void;
      if (event === "turn_end") handlers.set(event, handler as TurnEndHandler);
    },
    sendUserMessage: (content: string) => messages.push(content),
  } satisfies Partial<ExtensionAPI>;

  yakShavingGuardExtension(pi as ExtensionAPI);

  if (saved === undefined) delete process.env.YAK_SHAVING_CHAR_THRESHOLD;
  else process.env.YAK_SHAVING_CHAR_THRESHOLD = saved;

  return {
    userInput: () => inputHandler?.({ source: "interactive" } as never),
    assistantTurn(text: string, thinking = "") {
      const handler = handlers.get("turn_end");
      if (!handler) throw new Error("turn_end handler not registered");
      const content: Array<{ type: string; text?: string; thinking?: string }> = [];
      if (text) content.push({ type: "text", text });
      if (thinking) content.push({ type: "thinking", thinking });
      handler({ message: { role: "assistant", content } });
    },
    userTurn() {
      const handler = handlers.get("turn_end");
      if (!handler) throw new Error("turn_end handler not registered");
      handler({ message: { role: "user", content: [] } });
    },
    get messages() { return messages; },
  };
}

describe("yak-shaving-guard", () => {
  beforeEach(() => { testCharThreshold = undefined; });

  test("does not trigger below default threshold", () => {
    const h = createHarness();
    h.assistantTurn("hi");
    expect(h.messages).toEqual([]);
  });

  test("triggers after 400K chars by default", () => {
    const h = createHarness();
    for (let i = 0; i < 800; i++) h.assistantTurn("x".repeat(500));
    expect(h.messages).toHaveLength(1);
    expect(h.messages[0]).toContain("Yak Shaving Guard");
  });

  test("ignores user turns", () => {
    const h = createHarness();
    for (let i = 0; i < 2000; i++) h.userTurn();
    expect(h.messages).toEqual([]);
  });

  test("counts thinking and text", () => {
    const h = createHarness();
    for (let i = 0; i < 800; i++) h.assistantTurn("x".repeat(250), "x".repeat(250));
    expect(h.messages).toHaveLength(1);
  });

  test("resets on user input and does not retrigger until then", () => {
    const h = createHarness();
    for (let i = 0; i < 900; i++) h.assistantTurn("x".repeat(500));
    expect(h.messages).toHaveLength(1);
    for (let i = 0; i < 900; i++) h.assistantTurn("x".repeat(500));
    expect(h.messages).toHaveLength(1);
    h.userInput();
    for (let i = 0; i < 900; i++) h.assistantTurn("x".repeat(500));
    expect(h.messages).toHaveLength(2);
  });

  test("honors valid and ignores invalid env threshold", () => {
    testCharThreshold = "50";
    let h = createHarness();
    h.assistantTurn("x".repeat(49));
    expect(h.messages).toEqual([]);
    h.assistantTurn("x");
    expect(h.messages).toHaveLength(1);

    testCharThreshold = "not-a-number";
    h = createHarness();
    h.assistantTurn("x".repeat(50));
    expect(h.messages).toEqual([]);
  });
});
