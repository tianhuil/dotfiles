import { test, expect } from "bun:test";
import { phaseImplement, phaseImplementContinue } from "./implement";
import type { AiDriver, BuildWorktreeState } from "../types";

const MINIMAL_STATE: BuildWorktreeState = {
  branch: "feat/test",
  baseBranch: "origin/main",
  repoRoot: "/tmp/test-repo",
  worktreePath: "/tmp/test-repo/.worktrees/feat-test",
  prNumber: null,
  runId: null,
  phase: "setup",
  task: "Create a test file",
  validationIteration: 0,
  ciIteration: 0,
  failures: [],
};

test("phaseImplement sends prompt with worktree path and do-not-commit", async () => {
  let capturedPrompt = "";
  const ai: AiDriver = async (prompt) => {
    capturedPrompt = prompt;
  };

  await phaseImplement(ai, MINIMAL_STATE, 0);

  expect(capturedPrompt).toContain("/tmp/test-repo/.worktrees/feat-test");
  expect(capturedPrompt).toContain("Do NOT commit");
  expect(capturedPrompt).toContain("Create a test file");
});

test("phaseImplement round>0 sends fix instructions", async () => {
  let capturedPrompt = "";
  const ai: AiDriver = async (prompt) => {
    capturedPrompt = prompt;
  };

  await phaseImplement(ai, MINIMAL_STATE, 1, "Fix the lint error on line 42");

  expect(capturedPrompt).toContain("Fix validation / CI issues");
  expect(capturedPrompt).toContain("lint error on line 42");
});

test("phaseImplementContinue sends follow-up prompt with branch context", async () => {
  let capturedPrompt = "";
  const ai: AiDriver = async (prompt) => {
    capturedPrompt = prompt;
  };

  await phaseImplementContinue(ai, MINIMAL_STATE, "Add error handling");

  expect(capturedPrompt).toContain("Follow-up task on existing worktree");
  expect(capturedPrompt).toContain("feat/test");
  expect(capturedPrompt).toContain("Do NOT commit");
  expect(capturedPrompt).toContain("Add error handling");
});

test("phaseImplementContinue with PR number includes PR context", async () => {
  let capturedPrompt = "";
  const ai: AiDriver = async (prompt) => {
    capturedPrompt = prompt;
  };

  const withPr: BuildWorktreeState = { ...MINIMAL_STATE, prNumber: 42 };
  await phaseImplementContinue(ai, withPr, "Add tests");

  expect(capturedPrompt).toContain("PR #42");
});

test("scripted ai writes file simulates what real AI would do", async () => {
  // Simulate the AI creating a file (contract: ai is called with a prompt and returns void)
  const ai: AiDriver = async (_prompt) => {
    // In a real scenario the AI would write files; here we just verify the contract
  };
  const result = phaseImplement(ai, MINIMAL_STATE, 0);
  await expect(result).resolves.toBeUndefined();
});
