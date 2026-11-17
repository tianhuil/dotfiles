# Use Pi's own output truncation instead of rtk

We removed `git:github.com/MasuRii/pi-rtk-optimizer` from Pi's `settings.json`
(2026-11-17), although it saved tokens. It runs every agent shell command
through `rtk rewrite`, and those rewrites changed what ran. `pnpm lint` and
`biome …` became `rtk lint`, which ran a missing ESLint and reported pnpm's
exit 254 as `possibly out of memory`. That sent agents chasing a false Biome
OOM for weeks (rtk-ai/rtk#2879, still open on rtk 1.2.0). `pnpm vitest run`
became `rtk vitest`, which replaced vitest's `No test files found` with
`PASS (0) FAIL (0)`. Its output trimming kept the first 12,000 characters of
long results and ended them with a bare `...`, dropping the end of logs with no
notice. Pi's `bash` tool already keeps the last 50 KB / 2,000 lines and names
a file holding the full output, which is the simple behaviour we want.

Evidence: `notes/research/build-worktree-backpass-review/rtk-rewrites.md` in
the workspace (audit of 101 build-worktree sessions).

## Considered Options

- Pi's built-in truncation alone: chosen. Keeps the end of the output and says
  how much was cut; nothing rewrites commands.
- Keep rtk with `exclude_commands` for lint and Biome: rejected. It fixes only
  the rewrites already found; any other `rtk <tool>` can change behaviour the
  same way, and the 12,000-character trimming stays silent.
- A small Pi extension that applies Pi's `truncateTail` at a lower limit on the
  `tool_result` event: not built yet. Use it if the token cost below matters.

## Consequences

- In the 101 audited sessions rtk saved about 770k tokens of tool output.
  About 520k come back because long results are now cut at 50 KB instead of
  12,000 characters; about 240k came from rtk's `git`, test and search
  summaries and are lost.
- Agents in those sessions never opened Pi's full-output file (0 of 9); they
  reran narrower commands instead.
- rtk stays installed for OpenCode (`setup.sh` runs `rtk init -g --opencode`).
  Revisit Pi only if rtk stops rewriting commands it cannot run faithfully.
