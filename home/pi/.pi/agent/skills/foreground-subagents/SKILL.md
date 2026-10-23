---
name: foreground-subagents
description: When delegating work to Pi subagents, run every child in foreground so parent waits for its result; use for any subagent, workflow, review, or validation delegation.
---

# Foreground subagents

Run every delegated child in foreground.

- Direct `subagent` calls: set `async: false`.
- Workflow child runs: set their execution mode to foreground/blocking when the workflow API exposes it; prefer direct calls when it does not.
- Wait for each result before continuing parent work.
- Do not use `bg_wait` to compensate for a background launch.
- If foreground launch fails, stop and report exact error. Do not silently retry in background.

Apply this policy to scouts, writers, reviewers, gates, and validation agents. Preserve explicit user requests that require background execution.
