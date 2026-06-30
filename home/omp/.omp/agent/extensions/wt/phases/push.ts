import type { ExecFn, BuildWorktreeState, IoSink } from "../types";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { wtExec } from "../exec";

// ---------------------------------------------------------------------------
// Phase 3: Push PR — check remote, rebase, push branch, create gh PR
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

  // Derive base branch name (strip any origin/ prefix for gh and fetch)
  const baseRef = state.baseBranch.replace(/^origin\//, "");

  // Fetch latest remote state
  const fetch = await exec(`git fetch origin ${baseRef}`);
  if (fetch.exitCode !== 0) {
    io.notify(`Fetch failed: ${fetch.stderr || fetch.stdout}`, "warning");
  }

  // Rebase worktree onto origin/<baseRef> so commits sit on top of latest remote
  const rebase = await wtExec(
    exec,
    state.worktreePath,
    `git rebase origin/${baseRef}`,
  );
  if (rebase.exitCode !== 0) {
    io.notify(
      `Rebase onto origin/${baseRef} failed — worktree may have conflicts.\n` +
        `${rebase.stderr || rebase.stdout}`,
      "error",
    );
    throw new Error("REBASE_FAILED");
  }

  // Check there's at least one commit ahead before attempting a PR
  const ahead = await wtExec(
    exec,
    state.worktreePath,
    `git rev-list --count origin/${baseRef}..HEAD`,
  );
  const aheadCount = Number(ahead.stdout.trim());
  if (aheadCount === 0) {
    io.notify(
      `No new commits on ${state.branch} relative to origin/${baseRef}. ` +
        "The AI implementation produced no changes. Aborting push and PR.",
      "error",
    );
    throw new Error("NO_COMMITS_AHEAD");
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
    `gh pr create --title '${title.replace(/'/g, "'\\''")}' --body-file '${bodyFile}' --base '${baseRef}' --head '${state.branch}'`,
  );
  if (pr.exitCode !== 0) {
    const prErr = (pr.stderr + pr.stdout).trim() || "(no error output)";
    const prErrLower = prErr.toLowerCase();

    // Extract meaningful error message from gh GraphQL errors
    let userMsg: string;
    if (prErrLower.includes("base ref must be a branch")) {
      userMsg = `The base ref '${baseRef}' is not a valid branch on the remote. Check that the branch exists.`;
    } else if (prErrLower.includes("no commits between")) {
      userMsg =
        "No changes detected between head and base branches. " +
        "The AI may not have created any files. Try a more specific task description.";
    } else if (prErrLower.includes("head sha can't be blank")) {
      userMsg =
        "Could not resolve the head branch on the remote. " +
        "The push may have failed silently, or the branch name is invalid.";
    } else if (
      prErrLower.includes("pull request already exists") ||
      prErrLower.includes("already exists")
    ) {
      userMsg = `A pull request already exists for ${state.branch}. Use /wt-continue to update it.`;
    } else if (
      prErrLower.includes("auth") ||
      prErrLower.includes("permission") ||
      prErrLower.includes("login")
    ) {
      userMsg = "GitHub authentication error. Run `gh auth login` and retry.";
    } else {
      userMsg = prErr;
    }

    io.notify(`PR creation failed: ${userMsg}`, "error");
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
