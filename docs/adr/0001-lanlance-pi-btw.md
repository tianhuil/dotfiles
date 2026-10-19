# Use @lanlance/pi-btw for /btw side questions

Two near-identical pi extensions provide Claude Code-style `/btw` side questions:
`npm:@lanlance/pi-btw` (L2ncE) and `npm:pi-btw-cc` (Nouvelle-Lune, npm author
`lune_99`). We chose `@lanlance/pi-btw` because its side agent runs with pi's
native read-only tools (`read`/`grep`/`find`/`ls`, whitelist enforced at
`createAgentSession`), so it can inspect the repo to answer; `pi-btw-cc`'s side
request has no tools and answers from conversation context only. Audited safe:
npm tarball byte-identical to GitHub, no network/fs/exec beyond reading
`~/.pi/agent/btw.json`, and it reuses pi's own tool implementations rather than
custom ones.

`settings.json` cannot record this — it is strict JSON (comments cause
`Warning: Invalid settings file` and the whole file is ignored), so the
rejected alternative lives here instead.

## Considered Options

- `npm:@lanlance/pi-btw` — chosen. Side agent has read-only native tools;
  thread memory-only (lost on `/new`/restart); never touches main conversation.
- `npm:pi-btw-cc` — rejected. No tools (context-only answers), but has
  session-file persistence and `f` promote-to-main-conversation. Revisit if
  those matter more than repo inspection. Swap:
  `pi uninstall npm:@lanlance/pi-btw && pi install npm:pi-btw-cc`
  (both register `/btw` — cannot coexist).
