import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@oh-my-pi/pi-coding-agent";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";

// ---------------------------------------------------------------------------
// Types — exported so consumers can reference without ReturnType<> tricks
// ---------------------------------------------------------------------------

export interface BuildWorktreeState {
  branch: string;
  baseBranch: string;
  repoRoot: string;
  worktreePath: string;
  prNumber: number | null;
  runId: number | null;
  phase: string;
  task: string;
  validationIteration: number;
  ciIteration: number;
  failures: string[];
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CIResult {
  conclusion: string;
  runId: number | null;
  mergeable: string;
  mergeStateStatus: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATE_TYPE = "wt-build";

function slugify(text: string, max = 50): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max) || "untitled"
  );
}

interface BranchRule {
  pattern: RegExp;
  prefix: string;
}

const BRANCH_PREFIXES: BranchRule[] = [
  { pattern: /\b(fix|bug|crash|error|regression)\b/, prefix: "fix" },
  { pattern: /\b(chore|maintenance|dep|upgrade|tooling)\b/, prefix: "chore" },
  { pattern: /\b(refactor|restructure|rewrite|cleanup)\b/, prefix: "refactor" },
  { pattern: /\b(doc|readme|comment|documentation)\b/, prefix: "docs" },
  { pattern: /\b(test|spec|coverage)\b/, prefix: "test" },
  { pattern: /\b(perf|performance|speed|optimize)\b/, prefix: "perf" },
  { pattern: /\b(ci|cd|pipeline|workflow|action)\b/, prefix: "ci" },
  { pattern: /\b(format|lint|prettier)\b/, prefix: "style" },
  { pattern: /\b(build|bundler|compile)\b/, prefix: "build" },
  { pattern: /\b(design|prototype|spike)\b/, prefix: "design" },
  { pattern: /\b(research|investigate|explore|poc)\b/, prefix: "research" },
];

function inferBranchPrefix(task: string): string {
  const lower = task.toLowerCase();
  for (const { pattern, prefix } of BRANCH_PREFIXES) {
    if (pattern.test(lower)) return prefix;
  }
  return "feat";
}

function buildBranchName(task: string): string {
  const prefix = inferBranchPrefix(task);
  // Derive slug from first sentence
  const firstLine = task.split(/[.\n]/)[0] || task;
  return `${prefix}/${slugify(firstLine)}`;
}

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

// ---------------------------------------------------------------------------
// Exec wrapper — normalises pi.exec result into ExecResult
// ---------------------------------------------------------------------------

// ExecFn is the type of the execCommand function returned by createExec
export type ExecFn = (command: string) => Promise<ExecResult>;

function createExec(): ExecFn {
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
        const e = err as { stdout?: unknown; stderr?: unknown; exitCode?: unknown };
        return {
          stdout: e.stdout instanceof Buffer ? e.stdout.toString() : String(e.stdout ?? ""),
          stderr: e.stderr instanceof Buffer ? e.stderr.toString() : String(e.stderr ?? ""),
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

// Run a command inside the worktree directory
function wtExec(
  exec: ExecFn,
  worktreePath: string,
  command: string,
): Promise<ExecResult> {
  return exec(`cd ${worktreePath} && ${command}`);
}

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

function saveState(pi: ExtensionAPI, state: BuildWorktreeState): void {
  pi.appendEntry(STATE_TYPE, state);
}

function recoverState(
  ctx: ExtensionContext,
): BuildWorktreeState | null {
  let latest: BuildWorktreeState | null = null;
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "custom" && entry.customType === STATE_TYPE) {
      latest = entry.data as BuildWorktreeState;
    }
  }
  return latest;
}

// ---------------------------------------------------------------------------
// Phase 0: Setup — create worktree, determine branch name
// ---------------------------------------------------------------------------

async function phaseSetup(
  exec: ExecFn,
  task: string,
  ctx: ExtensionCommandContext,
): Promise<BuildWorktreeState> {
  ctx.ui.notify("Setting up worktree...", "info");

  // Determine base branch from remote HEAD
  let baseBranch = "origin/main";
  {
    const r = await exec("git symbolic-ref refs/remotes/origin/HEAD --short");
    if (r.exitCode === 0) baseBranch = r.stdout.trim();
  }

  // Fetch latest
  await exec("git fetch -q origin");

  // Derive branch name, handle collisions with -v2, -v3, ...
  const desired = buildBranchName(task);
  let branch = desired;
  let suffix = 2;
  const localBranchExists = async (b: string) => {
    const r = await exec(`git show-ref --verify --quiet refs/heads/${b}`);
    return r.exitCode === 0;
  };
  while (await localBranchExists(branch)) {
    branch = `${desired}-v${suffix}`;
    suffix++;
  }

  // Discover repo root
  const rootResult = await exec("git rev-parse --show-toplevel");
  if (rootResult.exitCode !== 0) {
    ctx.ui.notify("Not in a git repository — can't create worktree", "error");
    throw new Error("NOT_A_GIT_REPO");
  }
  const repoRoot = rootResult.stdout.trim();

  // Create worktree at <repo-root>/.worktrees/<branch-slug>
  const slug = branch.replace(/\//g, "-");
  const worktreePath = `${repoRoot}/.worktrees/${slug}`;
  await exec(`mkdir -p ${repoRoot}/.worktrees`);

  // Try to create worktree tracking a remote branch; fall back to HEAD
  const baseRef = baseBranch.replace(/^origin\//, "");
  let wtCmd = `git worktree add --track -b ${branch} ${worktreePath} origin/${baseRef}`;
  let wtResult = await exec(wtCmd);

  if (wtResult.exitCode !== 0) {
    // If tracking failed (no remote), create based on HEAD
    ctx.ui.notify("Remote tracking branch not found, creating worktree from HEAD", "info");
    wtCmd = `git worktree add -b ${branch} ${worktreePath} HEAD`;
    wtResult = await exec(wtCmd);
  }

  if (wtResult.exitCode !== 0) {
    ctx.ui.notify(
      `Worktree creation failed: ${wtResult.stderr || wtResult.stdout}`,
      "error",
    );
    throw new Error(`Worktree creation failed: ${wtResult.stderr}`);
  }

  ctx.ui.notify(`Worktree ready: ${worktreePath} (branch: ${branch})`, "info");

  const state: BuildWorktreeState = {
    branch,
    baseBranch,
    worktreePath,
    repoRoot,
    prNumber: null,
    runId: null,
    phase: "setup",
    task,
    validationIteration: 0,
    ciIteration: 0,
    failures: [],
  };

  return state;
}

// ---------------------------------------------------------------------------
// Phase 1: AI implementation — send task to AI and wait for completion
// ---------------------------------------------------------------------------

async function phaseImplement(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  state: BuildWorktreeState,
  round: number,
  fixInstructions?: string,
): Promise<void> {
  const prompt =
    round === 0
      ? [
          `## Build task`,
          ``,
          state.task,
          ``,
          `## Worktree`,
          ``,
          `All work must be done inside this worktree directory: \`${state.worktreePath}\``,
          `Use \`cd ${state.worktreePath}\` before any file operation or command.`,
          `Do NOT commit changes — I will commit for you.`,
          `Do NOT leave the worktree to modify files in the main repository.`,
        ].join("\n")
      : [
          `## Fix validation / CI issues`,
          ``,
          fixInstructions ?? "Fix the above issues in the worktree.",
          ``,
          `Worktree: \`${state.worktreePath}\``,
          `Use \`cd ${state.worktreePath}\` before any file operation or command.`,
          `Do NOT commit changes.`,
          `Do NOT leave the worktree.`,
        ].join("\n");

  // Ensure AI is idle before sending
  await ctx.waitForIdle();

  // sendMessage with triggerTurn starts a turn immediately when idle.
  // sendUserMessage does NOT support triggerTurn (per OMP docs).
  pi.sendMessage(
    { customType: "wt-build", content: prompt, display: true },
    { deliverAs: "steer", triggerTurn: true },
  );

  await ctx.waitForIdle();
}

// ---------------------------------------------------------------------------
// Phase 1 (continue): AI implements follow-up instructions on existing worktree
// ---------------------------------------------------------------------------

async function phaseImplementContinue(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  state: BuildWorktreeState,
  instructions: string,
): Promise<void> {
  const prompt = [
    `## Follow-up task on existing worktree`,
    ``,
    instructions,
    ``,
    `## Context`,
    ``,
    `This builds on an existing feature in worktree: \`${state.worktreePath}\``,
    `Branch: \`${state.branch}\` (PR #${state.prNumber ?? "unknown"} is already open).`,
    `You MAY modify existing files — this is a follow-up, not a fresh build.`,
    ``,
    `Use \`cd ${state.worktreePath}\` before any file operation or command.`,
    `Do NOT commit changes — I will commit for you.`,
    `Do NOT leave the worktree to modify files in the main repository.`,
  ].join("\n");

  // Ensure AI is idle before sending
  await ctx.waitForIdle();

  pi.sendMessage(
    { customType: "wt-build", content: prompt, display: true },
    { deliverAs: "steer", triggerTurn: true },
  );

  await ctx.waitForIdle();
}

// ---------------------------------------------------------------------------
// Phase 2: Commit + Validate
// ---------------------------------------------------------------------------

async function commitInWorktree(
  exec: ExecFn,
  state: BuildWorktreeState,
  message: string,
): Promise<boolean> {
  const add = await wtExec(exec, state.worktreePath, "git add -A");
  if (add.exitCode !== 0) return false;

  // Check if anything staged
  const diff = await wtExec(exec, state.worktreePath, "git diff --cached --quiet");
  if (diff.exitCode === 0) return false;

  const cmt = await wtExec(
    exec,
    state.worktreePath,
    `git commit -m "${message.replace(/"/g, '\\"')}"`,
  );
  return cmt.exitCode === 0;
}
async function discoverValidationCommands(
  exec: ExecFn,
  state: BuildWorktreeState,
): Promise<string[]> {
  const commands: string[] = [];
  const wt = state.worktreePath;

  // Parse package.json scripts section exactly — avoids substring false matches
  const pkg = await wtExec(exec, wt, `bun -e "const p=JSON.parse(await Bun.file('package.json').text());const s=p.scripts||{};console.log(Object.keys(s).join('\\n'))"`);
  if (pkg.exitCode === 0 && pkg.stdout.trim()) {
    const defined = new Set(pkg.stdout.trim().split("\n"));
    for (const script of ["test", "lint", "typecheck", "check", "validate", "format"]) {
      if (defined.has(script)) {
        commands.push(`bun run ${script}`);
      }
    }
  }

  return commands;
}

async function phaseValidate(
  exec: ExecFn,
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  state: BuildWorktreeState,
): Promise<boolean> {
  const cmds = await discoverValidationCommands(exec, state);

  if (cmds.length === 0) {
    ctx.ui.notify("No validation commands found, skipping", "info");
    return true;
  }

  ctx.ui.notify(`Running validation: ${cmds.join(", ")}`, "info");

  for (const cmd of cmds) {
    const r = await wtExec(exec, state.worktreePath, cmd);
    if (r.exitCode === 0) {
      ctx.ui.notify(`PASS: ${cmd}`, "info");
    } else {
      ctx.ui.notify(`FAIL: ${cmd}`, "error");
      state.failures.push(`Validation: ${cmd}\n${r.stderr || r.stdout}`);
      return false;
    }
  }

  return true;
}

async function phaseValidateLoop(
  exec: ExecFn,
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  state: BuildWorktreeState,
): Promise<boolean> {
  const MAX_VALIDATION_ITERS = 5;

  for (let iter = 0; iter < MAX_VALIDATION_ITERS; iter++) {
    state.validationIteration = iter + 1;
    state.phase = `validating (${iter + 1}/${MAX_VALIDATION_ITERS})`;
    saveState(pi, state);

    // Ensure we have a commit first
    const prefix = state.branch.split("/")[0];
    const commitMsg = iter === 0
      ? `${prefix}: initial implementation`
      : `fix: address validation failures (attempt ${iter + 1})`;
    await commitInWorktree(exec, state, commitMsg);

    const ok = await phaseValidate(exec, pi, ctx, state);
    if (ok) return true;

    // Send AI to fix
    await phaseImplement(pi, ctx, state, iter + 1, state.failures.join("\n\n"));
  }

  return false;
}

// ---------------------------------------------------------------------------
// Phase 3: Push PR
// ---------------------------------------------------------------------------

async function phasePushPR(
  exec: ExecFn,
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  state: BuildWorktreeState,
): Promise<void> {
  ctx.ui.notify("Pushing branch and creating PR...", "info");

  // Check for remote
  const remote = await exec("git remote get-url origin");
  if (remote.exitCode !== 0) {
    ctx.ui.notify("No remote configured — cannot push PR", "error");
    throw new Error("NO_REMOTE");
  }

  // Push
  const push = await wtExec(exec, state.worktreePath, `git push -u origin ${state.branch}`);
  if (push.exitCode !== 0) {
    // Check if it's an auth error
    const err = (push.stderr + push.stdout).toLowerCase();
    if (
      err.includes("auth") ||
      err.includes("permission") ||
      err.includes("403") ||
      err.includes("401")
    ) {
      ctx.ui.notify(
        "Git push auth/permission error. Run `gh auth login` manually and retry.",
        "error",
      );
      throw new Error("PUSH_AUTH_FAILURE");
    }
    ctx.ui.notify(`Push failed: ${push.stderr || push.stdout}`, "error");
    throw new Error("PUSH_FAILED");
  }

  // Write PR body to a unique temp file, cleaned up after
  const baseRef = state.baseBranch.replace(/^origin\//, "");
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
    `gh pr create --title '${title.replace(/'/g, "'\\''")}' --body-file '${bodyFile}' --base '${baseRef}'`,
  );
  if (pr.exitCode !== 0) {
    const prErr = ((pr.stderr + pr.stdout).trim() || "(no error output)");
    ctx.ui.notify(`PR creation failed: ${prErr}`, "error");
    await exec(`rm -rf '${tmpDir}'`).catch(() => {});
    throw new Error(`PR_CREATE_FAILED: ${prErr}`);
  }

  await exec(`rm -rf '${tmpDir}'`).catch(() => {});

  // Parse PR number from URL
  const prUrl = pr.stdout.trim();
  const prMatch = prUrl.match(/(\d+)$/);
  state.prNumber = prMatch ? Number(prMatch[1]) : null;
  state.phase = "pushed";

  ctx.ui.notify(`PR created: ${prUrl}`, "info");
}

// ---------------------------------------------------------------------------
// Phase 4: Monitor CI (polling, not gh run watch)
// ---------------------------------------------------------------------------

async function getRunId(
  exec: ExecFn,
  state: BuildWorktreeState,
): Promise<number | null> {
  const r = await exec(
    `gh run list --branch ${state.branch} --limit 1 --json databaseId --jq '.[0].databaseId'`,
  );
  if (r.exitCode !== 0 || !r.stdout.trim()) return null;
  const id = Number(r.stdout.trim());
  return Number.isFinite(id) ? id : null;
}

async function getRunConclusion(
  exec: ExecFn,
  runId: number,
): Promise<string> {
  const r = await exec(
    `gh run view ${runId} --json conclusion --jq '.conclusion'`,
  );
  return r.stdout.trim() || "pending";
}

async function getPRMergeState(
  exec: ExecFn,
  prNumber: number,
): Promise<{ mergeable: string; mergeStateStatus: string }> {
  const r = await exec(
    `gh pr view ${prNumber} --json mergeable,mergeStateStatus --jq '{mergeable, mergeStateStatus}'`,
  );
  if (r.exitCode !== 0) return { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" };
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" };
  }
}

async function getFailedJobs(
  exec: ExecFn,
  runId: number,
): Promise<string[]> {
  const r = await exec(
    `gh run view ${runId} --json jobs --jq '.jobs[] | select(.conclusion != "success") | .name'`,
  );
  if (r.exitCode !== 0 || !r.stdout.trim()) return [];
  return r.stdout.trim().split("\n").filter(Boolean);
}

async function getFailedLogs(
  exec: ExecFn,
  runId: number,
): Promise<string> {
  const r = await exec(`gh run view ${runId} --log-failed`);
  return r.stdout || r.stderr || "(no logs)";
}

async function phaseMonitorCI(
  exec: ExecFn,
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  state: BuildWorktreeState,
): Promise<CIResult> {
  ctx.ui.notify("Waiting for CI run to appear...", "info");

  // Wait up to 5 min for CI to appear
  let runId = await getRunId(exec, state);
  for (let i = 0; i < 30 && runId === null; i++) {
    await sleep(10_000);
    runId = await getRunId(exec, state);
  }
  if (runId === null) {
    ctx.ui.notify("No CI run appeared after 5 minutes", "warning");
    return {
      conclusion: "TIMEOUT",
      runId: null,
      mergeable: "UNKNOWN",
      mergeStateStatus: "UNKNOWN",
    };
  }

  state.runId = runId;
  state.phase = "monitoring-ci";
  saveState(pi, state);

  // Poll every 30s until conclusion is reached
  let conclusion = "";
  while (true) {
    await sleep(30_000);
    conclusion = await getRunConclusion(exec, runId);
    ctx.ui.notify(`CI status: ${conclusion}`, "info");

    if (["success", "failure", "cancelled", "timed_out"].includes(conclusion)) {
      break;
    }
  }

  const mergeState = await getPRMergeState(exec, state.prNumber!);

  return {
    conclusion,
    runId,
    mergeable: mergeState.mergeable,
    mergeStateStatus: mergeState.mergeStateStatus,
  };
}

// ---------------------------------------------------------------------------
// Phase 5: Fix CI failures
// ---------------------------------------------------------------------------

async function phaseFixCI(
  exec: ExecFn,
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  state: BuildWorktreeState,
  runId: number,
): Promise<void> {
  ctx.ui.notify("Fetching CI failure logs...", "info");

  const failedJobs = await getFailedJobs(exec, runId);
  const logs = await getFailedLogs(exec, runId);

  const ciFailureMessage = [
    `## CI failures`,
    ``,
    `Failed jobs: ${failedJobs.join(", ")}`,
    ``,
    `\`\`\`\n${logs.slice(0, 10_000)}\n\`\`\``,
    ``,
    `Fix the issues in the worktree: \`${state.worktreePath}\``,
    `Use \`cd ${state.worktreePath}\` before any file operation or command.`,
    `Do NOT commit changes.`,
  ].join("\n");

  await phaseImplement(pi, ctx, state, state.ciIteration + 1, ciFailureMessage);
}

// ---------------------------------------------------------------------------
// Phase 5 loop — CI failure retries
// ---------------------------------------------------------------------------

async function phaseCILoop(
  exec: ExecFn,
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  state: BuildWorktreeState,
  ciResult: CIResult,
): Promise<void> {
  const MAX_CI_ITERS = 5;

  while (
    ciResult.conclusion !== "success" &&
    ciResult.conclusion !== "TIMEOUT" &&
    state.ciIteration < MAX_CI_ITERS
  ) {
    // Handle merge conflicts
    if (
      ciResult.mergeable === "CONFLICTING" ||
      ciResult.mergeStateStatus === "DIRTY"
    ) {
      ctx.ui.notify(
        "Merge conflict detected. Rebasing onto base branch...",
        "warning",
      );
      const baseRef = state.baseBranch.replace(/^origin\//, "");
      await wtExec(exec, state.worktreePath, `git fetch origin ${baseRef}`);
      const rebase = await wtExec(exec, state.worktreePath, `git rebase ${state.baseBranch}`);
      if (rebase.exitCode !== 0) {
        ctx.ui.notify(
          "Merge conflict — resolve manually in the worktree, then force push.",
          "error",
        );
        throw new Error("MERGE_CONFLICT");
      }
      const push = await wtExec(exec, state.worktreePath, `git push --force-with-lease origin ${state.branch}`);
      if (push.exitCode !== 0) {
        ctx.ui.notify("Force push after rebase failed", "error");
        throw new Error("PUSH_FAILED");
      }
      // Re-monitor
      ciResult = await phaseMonitorCI(exec, pi, ctx, state);
      continue;
    }

    // Fix CI failures
    state.ciIteration++;
    state.phase = `fixing-ci (${state.ciIteration}/${MAX_CI_ITERS})`;
    saveState(pi, state);

    await phaseFixCI(exec, pi, ctx, state, ciResult.runId!);

    // Commit and push
    const commitMsg = `fix: CI issues (attempt ${state.ciIteration})`;
    await commitInWorktree(exec, state, commitMsg);

    const push = await wtExec(exec, state.worktreePath, `git push origin ${state.branch}`);
    if (push.exitCode !== 0) {
      ctx.ui.notify(`Push failed: ${push.stderr}`, "error");
      throw new Error("PUSH_FAILED");
    }

    ciResult = await phaseMonitorCI(exec, pi, ctx, state);
  }

  if (ciResult.conclusion === "success") {
    state.phase = "done";
    saveState(pi, state);
    ctx.ui.notify(
      `CI passed! PR #${state.prNumber} is ready. Branch: ${state.branch}`,
      "info",
    );
  } else if (state.ciIteration >= MAX_CI_ITERS) {
    state.phase = "ci-max-retries";
    saveState(pi, state);
    ctx.ui.notify(
      `CI failed after ${MAX_CI_ITERS} attempts. Branch: ${state.branch}`,
      "error",
    );
  }
}

// ---------------------------------------------------------------------------
// Full orchestration
// ---------------------------------------------------------------------------

async function orchestrate(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  task: string,
  opts: { noGh?: boolean } = {},
): Promise<void> {
  const exec = createExec();

  // --- Phase 0: Setup ---
  const state = await phaseSetup(exec, task, ctx);
  state.phase = "implementing";
  saveState(pi, state);

  // --- Phase 1: Implement ---
  await phaseImplement(pi, ctx, state, 0);

  state.phase = "validating";
  saveState(pi, state);

  const validationOk = await phaseValidateLoop(exec, pi, ctx, state);

  if (!validationOk) {
    ctx.ui.notify(
      `Validation failed after max retries. Worktree: ${state.worktreePath}. Run subsequent requests inside the worktree to fix issues manually.`,
      "error",
    );
    state.phase = "validation-failed";
    saveState(pi, state);
    return;
  }

  // --- Phase 3: Push PR ---
  if (!opts.noGh) {
    await phasePushPR(exec, pi, ctx, state);
    saveState(pi, state);

    // --- Phase 4: Monitor CI ---
    const ciResult = await phaseMonitorCI(exec, pi, ctx, state);

    // --- Phase 5: CI loop (fix failures, retry) ---
    await phaseCILoop(exec, pi, ctx, state, ciResult);
  }

  // Notify user to run subsequent requests in the worktree
  ctx.ui.notify(
    `Worktree ready at ${state.worktreePath}. Subsequent requests should be run inside this directory to build on this feature.`,
    "info",
  );
}

// ---------------------------------------------------------------------------
// Continue orchestration — resume work on an existing worktree
// ---------------------------------------------------------------------------

async function orchestrateContinue(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  instructions: string,
  opts: { noGh?: boolean } = {},
): Promise<void> {
  const state = recoverState(ctx);
  if (!state) {
    ctx.ui.notify(
      "No previous wt-build found in this session. Run /wt-build first.",
      "warning",
    );
    return;
  }

  const exec = createExec();

  // Verify the worktree still exists on disk
  const exists = await exec(`test -d ${state.worktreePath}`);
  if (exists.exitCode !== 0) {
    ctx.ui.notify(
      `Worktree no longer exists: ${state.worktreePath}. Cannot continue.`,
      "error",
    );
    return;
  }

  ctx.ui.notify(
    `Continuing on ${state.branch} (worktree: ${state.worktreePath})`,
    "info",
  );

  // Reset iteration counters and failures for the follow-up
  state.validationIteration = 0;
  state.ciIteration = 0;
  state.failures = [];
  state.phase = "continuing";
  saveState(pi, state);

  // --- AI implements the follow-up ---
  await phaseImplementContinue(pi, ctx, state, instructions);

  // --- Commit the follow-up ---
  const prefix = state.branch.split("/")[0];
  await commitInWorktree(exec, state, `${prefix}: follow-up changes`);

  // --- Validate (reuses the same loop as wt-build) ---
  state.phase = "validating";
  saveState(pi, state);
  const validationOk = await phaseValidateLoop(exec, pi, ctx, state);
  if (!validationOk) {
    ctx.ui.notify(
      `Validation failed after max retries. Worktree: ${state.worktreePath}.`,
      "error",
    );
    state.phase = "validation-failed";
    saveState(pi, state);
    return;
  }

  // --- Push to existing branch (PR already exists, no gh pr create) ---
  if (!opts.noGh) {
    state.phase = "pushing";
    saveState(pi, state);
    const push = await wtExec(
      exec,
      state.worktreePath,
      `git push origin ${state.branch}`,
    );
    if (push.exitCode !== 0) {
      const err = (push.stderr + push.stdout).toLowerCase();
      if (
        err.includes("auth") ||
        err.includes("permission") ||
        err.includes("403") ||
        err.includes("401")
      ) {
        ctx.ui.notify(
          "Git push auth/permission error. Run `gh auth login` and retry.",
          "error",
        );
        throw new Error("PUSH_AUTH_FAILURE");
      }
      ctx.ui.notify(`Push failed: ${push.stderr || push.stdout}`, "error");
      throw new Error("PUSH_FAILED");
    }
    ctx.ui.notify(`Pushed to ${state.branch}`, "info");

    // --- Monitor CI ---
    const ciResult = await phaseMonitorCI(exec, pi, ctx, state);

    // --- CI loop ---
    await phaseCILoop(exec, pi, ctx, state, ciResult);
  }

  if (opts.noGh) {
    ctx.ui.notify(
      `Follow-up complete. Worktree: ${state.worktreePath} (branch: ${state.branch}). No remote — push manually to proceed.`,
      "info",
    );
  } else {
    ctx.ui.notify(
      `Follow-up pushed. Worktree: ${state.worktreePath}, PR #${state.prNumber}.`,
      "info",
    );
  }
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function wtBuildExtension(pi: ExtensionAPI): void {
  pi.setLabel("WT Build");

  // ── User command: /wt-build <task> ────────────────────────────────────
  pi.registerCommand("wt-build", {
    description:
      "(extension) Build a feature in an isolated git worktree, validate locally, push a PR, and iterate until CI passes",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const noGh = args.includes("--no-gh");
      const task = args.replace("--no-gh", "").trim();
      if (!task) {
        ctx.ui.notify(
          "Usage: /wt-build <task description>",
          "warning",
        );
        return;
      }

      try {
        await orchestrate(pi, ctx, task, { noGh });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`WT build failed: ${msg}`, "error");
      }
    },
  });

  // ── User command: /wt-continue <instructions> ────────────────────────
  pi.registerCommand("wt-continue", {
    description:
      "(extension) Continue work on an existing wt-build worktree: implement follow-up changes, validate, push to the existing PR, and iterate until CI passes",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const noGh = args.includes("--no-gh");
      const instructions = args.replace("--no-gh", "").trim();
      if (!instructions) {
        ctx.ui.notify(
          "Usage: /wt-continue <follow-up instructions>",
          "warning",
        );
        return;
      }

      try {
        await orchestrateContinue(pi, ctx, instructions, { noGh });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`WT continue failed: ${msg}`, "error");
      }
    },
  });

  // ── Session resume: detect stale worktree and notify ─────────────────
  pi.on(
    "session_start",
    async (_event: unknown, ctx: ExtensionContext) => {
      const state = recoverState(ctx);
      if (state && state.phase !== "done") {
        ctx.ui.notify(
          `Incomplete wt-build found: ${state.branch} (phase: ${state.phase}). Worktree: ${state.worktreePath}`,
          "warning",
        );
      }
    },
  );
}
