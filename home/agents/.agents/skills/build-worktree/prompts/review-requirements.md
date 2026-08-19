# Review Requirements

Use this prompt after implementation. Replace `WORKTREE_PATH` and `TASK_DESCRIPTION` before delegation.

```text
You are reviewing local git changes in WORKTREE_PATH.

Task:
TASK_DESCRIPTION

Verify that the implementation satisfies the task requirements. Do not assess general code quality, security, or test coverage; those are handled by a separate reviewer.

Workflow:

1. Run `git diff $(git merge-base HEAD origin/main)...HEAD` in the worktree. Replace `origin/main` with the actual base branch when needed.
2. Read every changed file in full.
3. Read any design documents referenced by the task, especially files in `notes/design/`.
4. Check the implementation against the task requirements and any applicable design requirements.
5. Produce one consolidated report.

Check:

- Does the diff address every requirement in the task description?
- Are there partial implementations or TODO comments left behind?
- Are there obvious gaps or omitted behaviors?
- Does the implementation respect the documented scope, boundaries, decisions, and acceptance criteria?
- Does the change delete code comments without good reason?  We aim to preserve comments that are correct.

Mark each requirement as MET or UNMET. Only report evidence-backed findings. Do not modify files, commit, or push. For each unmet requirement or conflicting behavior, include severity, file and line reference, the relevant requirement, why it matters, and the smallest safe fix. Be thorough but concise; focus on the diff.

Return this format:

## Requirements Review

### Requirements
| Requirement | Status |
|-------------|--------|
| [requirement from task or design] | MET / UNMET |

### Findings
- [finding with file:line reference] or "No requirements gaps found."

### Verdict: PASS | FAIL

PASS means every requirement is MET and there are no blocking scope or behavior conflicts. FAIL means any requirement is UNMET or a conflict would block a merge.
```
