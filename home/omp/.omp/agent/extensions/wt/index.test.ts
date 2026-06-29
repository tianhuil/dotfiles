import { test, expect, describe, beforeEach } from "bun:test";
import wtExtension from "./index";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

interface SessionEntry {
  type: string;
  customType: string;
  data: unknown;
}

interface Notif {
  message: string;
  notifyType: string;
}

interface MockUi {
  notify: (message: string, notifyType: string) => void;
}

interface MockSessionManager {
  getBranch: () => SessionEntry[];
}

interface MockCtx {
  waitForIdle: () => Promise<void>;
  ui: MockUi;
  sessionManager: MockSessionManager;
}

describe("wt extension entry point", () => {
  let commands: Map<string, unknown>;
  let notifications: Notif[];
  let pi: Partial<ExtensionAPI>;
  let ctx: MockCtx;

  beforeEach(() => {
    commands = new Map();
    notifications = [];

    pi = {
      setLabel: () => {},
      registerCommand: (name: string, cmd: { handler: Function }) => {
        commands.set(name, cmd.handler);
      },
      appendEntry: () => {},
      on: () => {},
      sendMessage: () => {},
    };

    ctx = {
      waitForIdle: async () => {},
      ui: {
        notify: (message: string, notifyType: string) => {
          notifications.push({ message, notifyType });
        },
      },
      sessionManager: {
        getBranch: () => [],
      },
    };
  });

  test("registers wt-build, wt-continue, and wt-clean commands", () => {
    wtExtension(pi as ExtensionAPI);
    expect(commands.has("wt-build")).toBe(true);
    expect(commands.has("wt-continue")).toBe(true);
    expect(commands.has("wt-clean")).toBe(true);
  });

  test("wt-build without task shows usage", async () => {
    wtExtension(pi as ExtensionAPI);
    const handler = commands.get("wt-build") as Function;
    await handler("", ctx);

    const warns = notifications.filter(n => n.message.includes("Usage: /wt-build"));
    expect(warns.length).toBe(1);
  });

  test("wt-continue without instructions shows usage", async () => {
    wtExtension(pi as ExtensionAPI);
    const handler = commands.get("wt-continue") as Function;
    await handler("", ctx);

    const warns = notifications.filter(n => n.message.includes("Usage: /wt-continue"));
    expect(warns.length).toBe(1);
  });

  test("wt-continue without prior build shows warning", async () => {
    wtExtension(pi as ExtensionAPI);
    const handler = commands.get("wt-continue") as Function;
    await handler("add goodbye", ctx);

    const warns = notifications.filter(n => n.message.includes("No previous wt-build"));
    expect(warns.length).toBe(1);
  });

  test("session_start with incomplete state shows warning", async () => {
    // Add incomplete state to session entries
    const entries: SessionEntry[] = [{
      type: "custom",
      customType: "wt-build",
      data: { branch: "feat/test", phase: "implementing", worktreePath: "/tmp/test" },
    }];
    ctx.sessionManager.getBranch = () => entries;

    // Capture the on handler
    let onHandler: Function | null = null;
    pi.on = (event: string, handler: Function) => {
      if (event === "session_start") onHandler = handler;
    };

    wtExtension(pi as ExtensionAPI);
    expect(onHandler).not.toBeNull();

    await onHandler!({}, ctx as unknown as ExtensionContext);
    const warns = notifications.filter(n => n.message.includes("Incomplete wt-build"));
    expect(warns.length).toBe(1);
  });

  test("session_start with done state does NOT warn", async () => {
    const entries: SessionEntry[] = [{
      type: "custom",
      customType: "wt-build",
      data: { branch: "feat/test", phase: "done", worktreePath: "/tmp/test" },
    }];
    ctx.sessionManager.getBranch = () => entries;

    let onHandler: Function | null = null;
    pi.on = (event: string, handler: Function) => {
      if (event === "session_start") onHandler = handler;
    };

    wtExtension(pi as ExtensionAPI);
    await onHandler!({}, ctx as unknown as ExtensionContext);
    const warns = notifications.filter(n => n.message.includes("Incomplete wt-build"));
    expect(warns.length).toBe(0);
  });
});
