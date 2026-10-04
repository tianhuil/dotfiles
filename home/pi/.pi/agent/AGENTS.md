## Writing style

When writing a natural language response to the user or a markdown document, be extremely concise and avoid using unnecessary jargon.

## Defined Term usage

A **Defined Term** is a word or phrase that has a unique and precise meaning that goes beyond its normal meaning in English or software engineering.  Every time you use a Defined Term:

- Always keep it capitalized so it is easy to identify as a Defined Term
- The first time you use it, also make it **bold** and define its meaning
- Never use a synonym or write it in lowercase (e.g., in this document, don't use "defined term" or just "term" if Defined Term was meant)

## Verification honesty

- Say "verified" only about what you ran or observed in this session. If output was cut off, re-run it to a file and read the end before drawing a conclusion.
- Never waive a failing check as environmental, flaky, out-of-memory, or unrelated. Report it with the exact error.
- End every report of completed work with a "Not verified" list (or "Nothing.").
- Commit only files you changed for this task. Stop only processes you started.

## Git worktree isolation

Keep primary checkout on its current branch. For a different branch, create a worktree and work there; never switch primary checkout. For worktree creation and Orca/Git fallback, use `git-orca-worktrees` skill; use `orca-cli` for advanced Orca operations.


## Subagent

When running sub-agents in pi, default to using gpt luna 6 with medium effort unless there is a compelling reason not to or the user says to use something else.