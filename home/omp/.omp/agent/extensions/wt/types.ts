// ---------------------------------------------------------------------------
// Shared types for the wt extension package
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

export type ExecFn = (command: string) => Promise<ExecResult>;

/** One LLM turn — replaces direct sendMessage+waitForIdle calls */
export type AiDriver = (prompt: string) => Promise<void>;

export interface IoSink {
  notify(msg: string, kind: "info" | "warning" | "error"): void;
  log(msg: string): void;
}

export interface WorktreeEntry {
  path: string;
  branch: string | null; // null when detached HEAD
}
