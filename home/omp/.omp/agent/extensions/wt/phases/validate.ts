import type { ExecFn, AiDriver, BuildWorktreeState, IoSink } from "../types";
import { wtExec } from "../exec";
import { commitInWorktree } from "./commit";
import { phaseImplement } from "./implement";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const KNOWN_SCRIPTS = ["test", "lint", "typecheck", "check", "validate", "format"];

/**
 * Parse a worktree's package.json scripts and return `bun run <name>` for
 * every known validation script that the project defines.
 */
export async function discoverValidationCommands(
  exec: ExecFn,
  worktreePath: string,
): Promise<string[]> {
  const commands: string[] = [];

  const pkg = await wtExec(
    exec,
    worktreePath,
    `bun -e "const p=JSON.parse(await Bun.file('package.json').text());const s=p.scripts||{};console.log(Object.keys(s).join('\\n'))"`,
  );

  if (pkg.exitCode === 0 && pkg.stdout.trim()) {
    const defined = new Set(pkg.stdout.trim().split("\n"));
    for (const script of KNOWN_SCRIPTS) {
      if (defined.has(script)) {
        commands.push(`bun run ${script}`);
      }
    }
  }

  return commands;
}

// ---------------------------------------------------------------------------
// Phase: Validate — run all discovered validation commands
// ---------------------------------------------------------------------------

export async function phaseValidate(
  exec: ExecFn,
  state: BuildWorktreeState,
  io: IoSink,
): Promise<boolean> {
  const cmds = await discoverValidationCommands(exec, state.worktreePath);

  if (cmds.length === 0) {
    io.notify("No validation commands found, skipping", "info");
    return true;
  }

  io.notify(`Running validation: ${cmds.join(", ")}`, "info");

  for (const cmd of cmds) {
    const r = await wtExec(exec, state.worktreePath, cmd);
    if (r.exitCode === 0) {
      io.notify(`PASS: ${cmd}`, "info");
    } else {
      io.notify(`FAIL: ${cmd}`, "error");
      state.failures.push(`Validation: ${cmd}\n${r.stderr || r.stdout}`);
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Phase: Validate Loop — commit, validate, fix with AI, repeat up to 5×
// ---------------------------------------------------------------------------

export async function phaseValidateLoop(
  exec: ExecFn,
  ai: AiDriver,
  state: BuildWorktreeState,
  io: IoSink,
): Promise<boolean> {
  const MAX_VALIDATION_ITERS = 5;

  for (let iter = 0; iter < MAX_VALIDATION_ITERS; iter++) {
    state.validationIteration = iter + 1;
    state.phase = `validating (${iter + 1}/${MAX_VALIDATION_ITERS})`;

    // Ensure we have a commit first
    const prefix = state.branch.split("/")[0];
    const commitMsg =
      iter === 0
        ? `${prefix}: initial implementation`
        : `fix: address validation failures (attempt ${iter + 1})`;
    await commitInWorktree(exec, state, commitMsg);

    const ok = await phaseValidate(exec, state, io);
    if (ok) return true;

    // Send AI to fix
    await phaseImplement(ai, state, iter + 1, state.failures.join("\n\n"));
  }

  return false;
}
