import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

export default function zellijSession(pi: ExtensionAPI) {
  pi.setLabel("Zellij Session Manager");

  // ── Helpers ──────────────────────────────────────

  /** Run a shell command and return the exit code. */
  async function runShell(cmd: string): Promise<number> {
    const proc = Bun.spawn(["sh", "-c", cmd]);
    await proc.exited;
    return proc.exitCode ?? 1;
  }

  /** Run a shell command and capture stdout + stderr + exit code. */
  async function capture(
    cmd: string,
    cwd?: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const proc = Bun.spawn(["sh", "-c", cmd], { cwd });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;
    return { exitCode: proc.exitCode ?? 1, stdout, stderr };
  }

  /** Quote a string for single-quote shell context. */
  function sq(s: string): string {
    return `'${s.replace(/'/g, "'\\''")}'`;
  }

  /** Build a short unique tab label. */
  function tabLabel(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).slice(-4)}`;
  }

  /**
   * Open a new Zellij tab running `omp` with the given args.
   * Assumes we are inside a Zellij session — zellij CLI commands
   * target the session that owns the current terminal.
   */
  async function openOmpTab(
    label: string,
    cwd: string,
    extraArgs: string,
  ): Promise<boolean> {
    const tab = tabLabel(label);
    // Use `zellij action new-tab` which supports --name, --cwd, and initial command
    // all in one action. This is simpler and avoids the removed -t flag on `zellij run`.
    const cmd = `zellij action new-tab -n ${sq(tab)} --cwd ${sq(cwd)} -- omp ${extraArgs}`;
    const code = await runShell(cmd);
    return code === 0;
  }

  // ── z-fork ────────────────────────────────────────
  pi.registerCommand("z-fork", {
    description:
      "Fork the current session into a new Zellij tab. Requires a persisted session.",
    handler: async (_args, ctx) => {
      // sessionManager is read-only on ExtensionContext, available in command handlers
      const mgr = ctx.sessionManager as { sessionFile?: string } | undefined;
      const sessionFile = mgr?.sessionFile;
      if (!sessionFile) {
        ctx.ui.notify(
          "Session is not persisted — fork a file-backed session first",
          "error",
        );
        return;
      }

      const ok = await openOmpTab("fork", ctx.cwd, `--fork ${sq(sessionFile)}`);
      ctx.ui.notify(
        ok ? "Forked session into a new Zellij tab" : "Failed to fork session",
        ok ? "info" : "error",
      );
    },
  });

  // ── z-clone ──────────────────────────────────────
  pi.registerCommand("z-clone", {
    description:
      "Clone (fork) the current session into a new Zellij tab. Alias for z-fork.",
    handler: async (_args, ctx) => {
      const mgr = ctx.sessionManager as { sessionFile?: string } | undefined;
      const sessionFile = mgr?.sessionFile;
      if (!sessionFile) {
        ctx.ui.notify(
          "Session is not persisted — clone a file-backed session first",
          "error",
        );
        return;
      }

      const ok = await openOmpTab(
        "clone",
        ctx.cwd,
        `--fork ${sq(sessionFile)}`,
      );
      ctx.ui.notify(
        ok ? "Cloned session into a new Zellij tab" : "Failed to clone session",
        ok ? "info" : "error",
      );
    },
  });

  // ── z-new ─────────────────────────────────────────
  pi.registerCommand("z-new", {
    description: "Start a fresh session in a new Zellij tab",
    handler: async (_args, ctx) => {
      const ok = await openOmpTab("new", ctx.cwd, "");
      ctx.ui.notify(
        ok
          ? "New session started in a Zellij tab"
          : "Failed to start new session",
        ok ? "info" : "error",
      );
    },
  });

  // ── z-resume ──────────────────────────────────────
  pi.registerCommand("z-resume", {
    description: "Open the session picker in a new Zellij tab",
    handler: async (_args, ctx) => {
      const ok = await openOmpTab("resume", ctx.cwd, "--resume");
      ctx.ui.notify(
        ok
          ? "Session picker opened in a Zellij tab"
          : "Failed to open session picker",
        ok ? "info" : "error",
      );
    },
  });
}
