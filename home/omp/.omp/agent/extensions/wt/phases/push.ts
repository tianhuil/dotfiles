import type { ExecFn, BuildWorktreeState, IoSink } from "../types";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { wtExec } from "../exec";

// ---------------------------------------------------------------------------
// Phase 3: Push PR — check remote, push branch, create gh PR
// ---------------------------------------------------------------------------

export async function phasePushPR(
  exec: ExecFn,
  state: BuildWorktreeState,
  io: IoSink,
): Promise<void> {
  io.notify("Pushing branch and creating PR...", "info");

  // Check for remote
  const remote = await exec("git remote get-url origin");
  if (remote.exitCode !== 0) {
    io.notify("No remote configured — cannot push PR", "error");
    throw new Error("NO_REMOTE");
  }

  // Derive base branch (strip any origin/ prefix for fetch)
  const baseRef = state.baseBranch.replace(/^origin\//, "");

  // Fetch latest remote state before pushing
  const fetch = await exec(`git fetch origin ${baseRef}`);
  if (fetch.exitCode !== 0) {
    io.notify(`Fetch failed: ${fetch.stderr || fetch.stdout}`, "warning");
  }

  // Push
  const push = await wtExec(
    exec,
    state.worktreePath,
    `git push -u origin ${state.branch}`,
  );
  if (push.exitCode !== 0) {
    const err = (push.stderr + push.stdout).toLowerCase();
    if (
      err.includes("auth") ||
      err.includes("permission") ||
      err.includes("403") ||
      err.includes("401")
    ) {
      io.notify(
        "Git push auth/permission error. Run `gh auth login` manually and retry.",
        "error",
      );
      throw new Error("PUSH_AUTH_FAILURE");
    }
    io.notify(`Push failed: ${push.stderr || push.stdout}`, "error");
    throw new Error("PUSH_FAILED");
  }

  // Write PR body to a unique temp file, cleaned up after
  const title = (state.task.split("\n")[0] ?? "").slice(0, 72);

  const body = [
    `## Summary`,
    ``,
    state.task,
    ``,
    `## Changes`,
    ``,
    `- Implements: ${title}`,
  ].join("\n");

  const tmpDir = mkdtempSync(join(tmpdir(), "wt-build-"));
  const bodyFile = join(tmpDir, "body.md");
  await Bun.write(bodyFile, body);

  const pr = await exec(
    `gh pr create --title '${title.replace(/'/g, "'\\''")}' --body-file '${bodyFile}' --base 'origin/${baseRef}' --head '${state.branch}'`,
  );
  if (pr.exitCode !== 0) {
    const prErr = (pr.stderr + pr.stdout).trim() || "(no error output)";
    io.notify(`PR creation failed: ${prErr}`, "error");
    await exec(`rm -rf '${tmpDir}'`).catch(() => {});
    throw new Error(`PR_CREATE_FAILED: ${prErr}`);
  }

  await exec(`rm -rf '${tmpDir}'`).catch(() => {});

  // Parse PR number from URL
  const prUrl = pr.stdout.trim();
  const prMatch = prUrl.match(/(\d+)$/);
  state.prNumber = prMatch ? Number(prMatch[1]) : null;
  state.phase = "pushed";

  io.notify(`PR created: ${prUrl}`, "info");
}
