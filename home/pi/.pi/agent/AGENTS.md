## Writing Style

When writing in response or a document, be extremely concise and avoid using unnecessary jargon.

A **Defined Term** is a word or phrase that has a unique and precise meaning that goes beyond its normal meaning in English or software engineering.  Every time you use a Defined Term:

- Always keep it capitalized so it is easy to identify as a Defined Term
- The first time you use it, also make it **bold** and define its meaning
- Never use a synonym or write it in lowercase (e.g., in this document, don't use "defined term" or just "term" if Defined Term was meant)

## Git worktree isolation

Keep the primary checkout on its current branch. For tasks that need a different branch, create a new Git worktree and do all work there. Never run `git checkout` or `git switch` in the primary checkout.
