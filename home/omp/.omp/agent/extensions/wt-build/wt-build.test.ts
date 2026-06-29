import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import wtBuildExtension from "./index";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

// ──────────────────────────────────────────────────
// Test harness — provides scripted AI, real exec,
// real git, in-memory state round-trip
// ──────────────────────────────────────────────────

interface Entry {
  type: string;
  customType: string;
  data: unknown;
}
interface Notif {
  message: string;
  notifyType: string;
}
type Handler = (args: string, ctx: unknown) => Promise<void>;

/** Queue of (worktreePath) => void callbacks the scripted AI executes in order */
const aiActions: Array<(wt: string) => void> = [];
let aiCallIndex = 0;

function createHarness() {
  const entries: Entry[] = [];
  const notifications: Notif[] = [];
  const commands = new Map<string, Handler>();

  const pi = {
    setLabel: () => {},
    registerCommand: (name: string, cmd: { handler: Handler }) => {
      commands.set(name, cmd.handler);
    },
    appendEntry: (customType: string, data: unknown) => {
      entries.push({ type: "custom", customType, data });
    },
    on: () => {},
    sendMessage: (message: { content: string | unknown[] }) => {
      const content = typeof message.content === "string" ? message.content : "";
      const m = content.match(/`([^`]*\.worktrees[^`]*)`/);
      const wt = m?.[1] ?? "";
      if (aiCallIndex < aiActions.length) {
        aiActions[aiCallIndex]!(wt);
        aiCallIndex++;
      }
    },
  };

  const ctx = {
    waitForIdle: async () => {},
    ui: {
      notify: (message: string, notifyType: string) => {
        notifications.push({ message, notifyType });
      },
    },
    sessionManager: {
      getBranch: () => entries,
    },
  };

  return { pi, ctx, commands, notifications, entries };
}

// ──────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────

describe("wt-build extension", () => {
  const origCwd = process.cwd();
  let repoDir: string;

  beforeAll(() => {
    repoDir = mkdtempSync(join(tmpdir(), "wt-build-integration-"));
    process.chdir(repoDir);
    execSync("git init -b main", { cwd: repoDir });
    execSync("git config user.email test@test.com", { cwd: repoDir });
    execSync("git config user.name Test User", { cwd: repoDir });
    writeFileSync(join(repoDir, "README.md"), "# Test Repo\n");
    execSync("git add -A && git commit -m initial", { cwd: repoDir });
  });

  afterAll(() => {
    process.chdir(origCwd);
    rmSync(repoDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    aiCallIndex = 0;
    aiActions.length = 0;
  });

  // ── Registration ──

  test("registers wt-build and wt-continue commands", () => {
    const { pi, commands } = createHarness();
    wtBuildExtension(pi as unknown as ExtensionAPI);
    expect(commands.has("wt-build")).toBe(true);
    expect(commands.has("wt-continue")).toBe(true);
  });

  // ── wt-build --no-gh ──

  test("wt-build --no-gh creates worktree, runs scripted AI, commits", async () => {
    const { pi, ctx, commands, notifications } = createHarness();
    wtBuildExtension(pi as unknown as ExtensionAPI);

    let buildWorktreePath = "";
    aiActions.push((wt) => {
      buildWorktreePath = wt;
      writeFileSync(join(wt, "hello.txt"), "hello world\n");
    });

    await commands.get("wt-build")!(
      "--no-gh create a file called hello.txt with content: hello world",
      ctx,
    );

    // Worktree directory exists
    expect(existsSync(buildWorktreePath)).toBe(true);

    // File created by scripted AI
    const filePath = join(buildWorktreePath, "hello.txt");
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, "utf-8")).toContain("hello world");

    // Commit on the branch
    const log = execSync(`git -C ${buildWorktreePath} log --oneline`, {
      encoding: "utf-8",
    });
    expect(log).toContain("initial implementation");

    // --no-gh means no push/CI notification (specific to gh workflow calls)
    const ghMessages = [
      "Pushing branch",   // phasePushPR
      "PR created",       // phasePushPR
      "Waiting for CI",   // phaseMonitorCI
    ];
    const ghNots = notifications.filter((n) =>
      ghMessages.some((m) => n.message.includes(m)),
    );
    expect(ghNots.length).toBe(0);
  });

  // ── wt-build + wt-continue ──

  test("wt-build then wt-continue --no-gh modifies file, creates follow-up commit", async () => {
    const { pi, ctx, commands, notifications } = createHarness();
    wtBuildExtension(pi as unknown as ExtensionAPI);

    let buildWorktreePath = "";
    aiActions.push((wt) => {
      buildWorktreePath = wt;
      writeFileSync(join(wt, "hello.txt"), "hello world\n");
    });
    aiActions.push((wt) => {
      writeFileSync(join(wt, "hello.txt"), "hello world\ngoodbye world\n");
    });

    // Phase 1: build
    await commands.get("wt-build")!(
      "--no-gh create hello.txt",
      ctx,
    );

    expect(existsSync(buildWorktreePath)).toBe(true);

    // Phase 2: continue — recovers state, modifies file
    await commands.get("wt-continue")!(
      "--no-gh add goodbye world to hello.txt",
      ctx,
    );

    // File now has both lines
    const content = readFileSync(join(buildWorktreePath, "hello.txt"), "utf-8");
    expect(content).toContain("hello world");
    expect(content).toContain("goodbye world");

    // Two commits: initial implementation + follow-up
    const log = execSync(`git -C ${buildWorktreePath} log --oneline`, {
      encoding: "utf-8",
    });
    const commits = log.trim().split("\n").filter(Boolean);
    expect(commits.length).toBeGreaterThanOrEqual(2);
    expect(log).toContain("follow-up");

    // State recovered correctly: prNumber and branch consistent across both calls
    const continueNots = notifications.filter(
      (n) => n.message.includes("Continuing on"),
    );
    expect(continueNots.length).toBe(1);

    // No push/CI activity
    const ghMessages = [
      "Pushing branch",   // phasePushPR
      "PR created",       // phasePushPR
      "Waiting for CI",   // phaseMonitorCI
    ];
    const ghNots = notifications.filter((n) =>
      ghMessages.some((m) => n.message.includes(m)),
    );
    expect(ghNots.length).toBe(0);
  });

  // ── Edge: continue without prior build ──

  test("wt-continue without prior build shows warning", async () => {
    const { pi, ctx, commands, notifications } = createHarness();
    wtBuildExtension(pi as unknown as ExtensionAPI);

    // No state in this harness → recoverState returns null
    await commands.get("wt-continue")!("add goodbye", ctx);

    const warns = notifications.filter(
      (n) => n.message.includes("No previous wt-build"),
    );
    expect(warns.length).toBe(1);
  });

  // ── Edge: wt-build without args shows usage ──

  test("wt-build without task shows usage", async () => {
    const { pi, ctx, commands, notifications } = createHarness();
    wtBuildExtension(pi as unknown as ExtensionAPI);

    await commands.get("wt-build")!("", ctx);

    const warns = notifications.filter(
      (n) => n.message.includes("Usage: /wt-build"),
    );
    expect(warns.length).toBe(1);
  });

  test("wt-continue without instructions shows usage", async () => {
    const { pi, ctx, commands, notifications } = createHarness();
    wtBuildExtension(pi as unknown as ExtensionAPI);

    await commands.get("wt-continue")!("", ctx);

    const warns = notifications.filter(
      (n) => n.message.includes("Usage: /wt-continue"),
    );
    expect(warns.length).toBe(1);
  });
});
