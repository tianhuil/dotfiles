# Review rules

Both reviewers follow these. `UPPER_CASE` values come from the task, or else from the contract file it names.

- **Checkout.** In WORKTREE_PATH, run `pwd`, `git branch --show-current`, `git rev-parse HEAD`, and `git status --porcelain`. Not EXPECTED_BRANCH at EXPECTED_HEAD: FAIL "wrong checkout". Dirty: FAIL "dirty checkout".
- **Read-only.** Leave project files, commits, and pushes alone. Run commands you expect to fail as `<cmd>; echo "rc=$?"` and judge `rc=`.
- **Scope.** A finding shows this diff causes a defect or keeps the contract from passing. Pre-existing defects, adjacent improvements, cleanup, preferences, and new requirements are Follow-up notes. Findings the contract file lists under "Deferred by the owner" never block; skip them.
- **Edge cases.** Error paths, inputs, and tool states neither the design nor the task names are `best-effort`: imperfect handling is a follow-up note, and the smallest fix may be deleting that handling. A diagnostic's wording blocks only when following it would cause damage. If an undecided case matters, judge it with the cheapest sensible label from [Common design rules](../../design/common-rules.md) (prefer `rejected` or `best-effort`) and list it under Edge cases judged; it is a finding only when the code clearly contradicts a `handled` or `rejected` judgment. When the right behavior is genuinely unclear, list it under Questions for the owner with a recommendation instead.
- **Findings** give severity (Critical/High/Medium/Low), `file:line`, why it matters, and the smallest safe fix.

## Rounds

REVIEW_ROUND picks one:

- `first`: read `git diff $(git merge-base HEAD BASE_BRANCH)...HEAD` and every changed file in full.
- `re-review`: first say whether each prior finding is fixed; an open one keeps its status. Then review the whole diff. A new finding blocks only if it is Critical or High inside the fix diff (`git diff <previous reviewed HEAD>..HEAD`), or Critical outside it. List the rest under Follow-up notes as "found late".
- `narrow re-review`: as `re-review`, but read only the fix diff and the prior findings; everything else carries forward.
- `final full review`: a `first` review where only Critical findings block. List High and lower as "non-blocking (final review)".

## Report tail

After your own sections, end with these, writing "None." when empty, then the verdict:

```markdown
### Edge cases judged
- <case> — <label>: <one-sentence behavior>; code matches: yes/no

### Questions for the owner
- <case> — recommend: <label>: <one-sentence behavior>

### Follow-up notes
### Not verified
```
