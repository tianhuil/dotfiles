---
name: foreground-subagents
description: Fallback for Pi subagents when background execution fails or cannot deliver completion; use foreground execution only after reporting the exact failure.
---

# Foreground subagents

Use foreground execution only as fallback when background execution fails or cannot deliver completion.

- Prefer background execution for delegated children.
- Direct `subagent` calls: use `async: false` only after reporting the exact background failure.
- Workflow child runs: use foreground/blocking mode only when background mode is unavailable or failed.
- Preserve explicit user requests for foreground execution.
- Do not silently retry a failed foreground launch in background.

Apply this fallback to scouts, writers, reviewers, gates, and validation agents.
