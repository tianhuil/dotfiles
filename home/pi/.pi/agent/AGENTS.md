## Writing style

When writing a natural language response to the user or a markdown document, be extremely concise and avoid using unnecessary jargon.

## Defined Term usage

A **Defined Term** is a word or phrase that has a unique and precise meaning that goes beyond its normal meaning in English or software engineering.  Every time you use a Defined Term:

- Always keep it capitalized so it is easy to identify as a Defined Term
- The first time you use it, also make it **bold** and define its meaning
- Never use a synonym or write it in lowercase (e.g., in this document, don't use "defined term" or just "term" if Defined Term was meant)

## Git worktree isolation

Keep primary checkout on its current branch. For a different branch, create a worktree and work there; never switch primary checkout. For worktree creation and Orca/Git fallback, use `git-orca-worktrees` skill; use `orca-cli` for advanced Orca operations.
