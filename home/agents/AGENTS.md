# Git worktree isolation

Keep the primary checkout on its current branch. For tasks that need a different branch, create a new Git worktree and do all work there. Never run `git checkout` or `git switch` in the primary checkout.
