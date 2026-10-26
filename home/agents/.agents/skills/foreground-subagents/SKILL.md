---
name: foreground-subagents
description: Prefer foreground subagents, then automatically retry in the background when foreground execution fails for a non-obvious reason.
---

# Foreground subagents

Prefer foreground execution for delegated agents. If a foreground agent fails for a non-obvious reason, automatically retry it in the background.

- Direct `subagent` calls: start with `async: false`; on a non-obvious failure, retry with `async: true`.
- Workflow child runs: start in foreground/blocking mode; on a non-obvious failure, retry in the background.
- Do not switch modes for an explicit user request that specifies foreground or background execution.
- Do not retry when the failure clearly identifies a task or input error; report that failure instead.

Apply this behavior to scouts, writers, reviewers, gates, and validation agents.
