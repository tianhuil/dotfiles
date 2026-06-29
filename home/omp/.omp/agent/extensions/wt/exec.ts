import type { ExecFn, ExecResult } from "./types";

// ---------------------------------------------------------------------------
// Exec wrapper — normalises Bun.spawn into ExecResult
// Unified from wt-build + wt-clean; ?? 0 bug fixed to ?? 1
// ---------------------------------------------------------------------------

export function createExec(): ExecFn {
  return async function execCommand(
    command: string,
  ): Promise<ExecResult> {
    try {
      const proc = Bun.spawn(["sh", "-c", command]);
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      await proc.exited;
      return {
        stdout,
        stderr,
        exitCode: proc.exitCode ?? 1,
      };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "exitCode" in err) {
        const e = err as {
          stdout?: unknown;
          stderr?: unknown;
          exitCode?: unknown;
        };
        return {
          stdout:
            e.stdout instanceof Buffer
              ? e.stdout.toString()
              : String(e.stdout ?? ""),
          stderr:
            e.stderr instanceof Buffer
              ? e.stderr.toString()
              : String(e.stderr ?? ""),
          exitCode: typeof e.exitCode === "number" ? e.exitCode : 1,
        };
      }
      return {
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
      };
    }
  };
}

/** Run a command inside the worktree directory */
export function wtExec(
  exec: ExecFn,
  worktreePath: string,
  command: string,
): Promise<ExecResult> {
  return exec(`cd ${worktreePath} && ${command}`);
}
