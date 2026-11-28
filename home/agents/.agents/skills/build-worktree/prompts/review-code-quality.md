# Review Code Quality

Use this prompt after implementation. Each `UPPER_CASE` placeholder takes its value from the task, or else from the contract file the task names (build-worktree Step 0.5).

---

You are reviewing local git changes in WORKTREE_PATH.

Expected checkout: branch EXPECTED_BRANCH at commit EXPECTED_HEAD, base BASE_BRANCH.

Review round (`first`, or `re-review` with the previous reviewed HEAD): REVIEW_ROUND

Task context:
TASK_DESCRIPTION

You are the consolidated review gate for correctness, security, and test integrity, and you note code-quality concerns. Do not review whether the task is complete; the requirements reviewer owns completeness and end-to-end evidence. You own whether the code and its tests are sound.

Workflow:

1. Run `pwd`, `git branch --show-current`, `git rev-parse HEAD`, and `git status --porcelain` in WORKTREE_PATH. If the first three do not match the expected checkout, stop and return Verdict: FAIL with reason "wrong checkout"; if the tree is not clean, return FAIL with reason "dirty checkout". Run at most targeted tests for the files you judge; the orchestrator runs the full verify command and the requirements reviewer runs any servers.
2. Run `git diff $(git merge-base HEAD BASE_BRANCH)...HEAD` in the worktree and read every changed file in full.
3. Find tests related to the changed code.
4. Check the project's AGENTS.md, README, and coding-standards documentation for applicable conventions. For Python or TypeScript code, also consult the [Python coding standards](../../python-coding-standards/SKILL.md) or [TypeScript coding standards](../../ts-coding-standards/SKILL.md) skill.
5. Produce one consolidated report.

Only report real, evidence-backed concerns. Scope findings to defects caused by this diff or defects that prevent the captured task contract from passing. Label pre-existing defects, adjacent improvements, cleanup, preferences, and new requirements as follow-up notes; they must not create a fix round. Skip web-specific checks when the code has no web surface.

An edge case is mishandled only when the code contradicts its edge-case label in the design ([Common design rules](../../design/common-rules.md)) or a judgment you made below; a `best-effort` case never blocks. If a corner case matters and the design does not decide it, make a reasonable judgment: pick the cheapest sensible label (prefer `rejected` or `best-effort`) and one-sentence behavior, and list it under Edge cases judged. Report a finding only if the code clearly contradicts a `handled` or `rejected` judgment. When the right behavior is genuinely unclear, list it under Questions for the owner instead, with your recommendation, not as a finding.

Blocking findings (any one makes the verdict FAIL):

- Correctness: the changed code gives wrong results, mishandles an error path or a decided edge case, races, or breaks an existing caller
- Security:
  - Hardcoded secrets, tokens, passwords, or connection strings
  - Missing input validation or sanitization
  - Authorization bypasses
  - SQL injection, command injection, XSS, path traversal, or similar vulnerabilities
  - Risky or inappropriate dependencies
  - Sensitive data exposed through logs or responses
- Tests that cannot fail: comparing an artifact to itself, asserting a mock's own return value, checking only that a file or key exists, or reading back the output they just wrote; and new skips, `.todo`, widened tolerances, `|| true`, or `continue-on-error` that hide failures

Non-blocking findings (report under Follow-up Notes; they never make the verdict FAIL or start a fix round):

- Code quality: duplication, overly long or nested functions, unclear naming, hard-to-read code, logic that reinvents an existing project utility, obvious performance issues (N+1 queries, unnecessary re-renders, missing indexes)
- Other test gaps: new code paths without tests, tests of implementation details instead of behavior, missing edge-case or error-path coverage, happy-path-only tests
- Test isolation: leaked processes or servers, fixed ports that collide with other worktrees, real network calls that should be local, broad `pkill`/`killall` patterns that can kill other sessions' processes

Re-review rule. When REVIEW_ROUND is `re-review`, first report whether each prior finding is fixed; a prior finding that is still open keeps its original blocking status. Then review the whole diff as usual and report everything you find. A new finding in lines changed by `git diff <previous reviewed HEAD>..HEAD` blocks under the normal rules. A new finding anywhere else blocks only if it is Critical; otherwise list it under Follow-up Notes marked "found late, outside the fix".

Do not write tests or modify project files. Do not commit or push. For each finding, include severity, file and line reference, why it matters, and the smallest safe fix. Be thorough but concise; focus on the diff and only flag issues that matter.

Return this format:

## Code Quality Review

Checkout: <pwd> <branch> <HEAD>  (matches expected: yes/no)

### Correctness Findings
- [finding with file:line reference] or "No correctness issues found."

### Security Findings
- [finding with file:line reference] or "No security concerns found."

### Tests That Cannot Fail
- [finding with file:line reference] or "None found."

### Edge cases judged
- <corner case> — <label>: <one-sentence behavior>; code matches: yes/no   (or "None.")

### Questions for the owner
- <corner case> — recommend: <label>: <one-sentence behavior>   (or "None.")

### Follow-up Notes
- [non-blocking or out-of-scope concern with file:line reference] or "None."

### Verdict: PASS | FAIL

PASS means the checkout matched and there are no blocking findings after the re-review rule. FAIL means the checkout did not match or at least one blocking finding exists.
