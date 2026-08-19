# Review Code Quality

Use this prompt after implementation. Replace `WORKTREE_PATH` and `TASK_DESCRIPTION` before delegation.

```text
You are reviewing local git changes in WORKTREE_PATH.

Task context:
TASK_DESCRIPTION

You are the consolidated review gate for code quality, security, and test coverage. Do not review whether the task is complete; focus only on the quality of the implementation.

Workflow:

1. Run `git diff $(git merge-base HEAD origin/main)...HEAD` in the worktree. Replace `origin/main` with the actual base branch when needed.
2. Read every changed file in full.
3. Find tests related to the changed code.
4. Check the project's AGENTS.md, README, and coding-standards documentation for applicable conventions.
5. Produce one consolidated report.

Code quality:

- Duplication: repeated logic that should be extracted
- Complexity: functions or methods that are too long or deeply nested
- Naming: unclear or inconsistent variables, functions, or files
- Readability: code that would be difficult for a new contributor to understand
- Reuse: logic that reinvents an existing project utility
- Performance: obvious issues such as N+1 queries, unnecessary re-renders, or missing indexes

Security:

- Hardcoded secrets, tokens, passwords, or connection strings
- Missing input validation or sanitization
- Authorization bypasses
- SQL injection, command injection, XSS, path traversal, or similar vulnerabilities
- Risky or inappropriate dependencies
- Sensitive data exposed through logs or responses

Only report real, evidence-backed concerns. Skip web-specific checks when the code has no web surface.

Test coverage:

- New code paths without adequate tests
- Tests that verify implementation details instead of behavior
- Missing edge-case and error-path coverage
- Shallow tests that cover only the happy path

Do not write tests or modify project files. Do not commit or push. For each finding, include severity, file and line reference, why it matters, and the smallest safe fix. Be thorough but concise; focus on the diff and only flag issues that matter.

Return this format:

## Code Quality Review

### Code Quality Findings
- [finding with file:line reference] or "No code quality concerns found."

### Security Findings
- [finding with file:line reference] or "No security concerns found."

### Test Coverage Gaps
- [gap with file:line reference] or "Test coverage is adequate."

### Verdict: PASS | FAIL

PASS means there are no P0/P1 code quality or security issues and no blocking test-coverage gaps. FAIL means a finding would block a merge.
```
