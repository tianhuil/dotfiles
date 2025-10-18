# Resolve merge conflictsRebase Current Branch

Run the following bash commands:

```bash
gh repo view --json defaultBranchRef # get default branch
git merge-base [default-branch] HEAD # get merge base
```

Now diff against the merge base to understand the intent of the change.

Rebase the current branch onto the default branch.

Resolve any merge conflicts.

Do not complete the rebase.
