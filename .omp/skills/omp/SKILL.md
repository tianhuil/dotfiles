---
name: omp
description: General orientation for Oh My Pi (OMP), the pi fork this dotfiles repo targets. Use when you need to know what OMP is, how to read its inline docs via the omp:// URI scheme (read("omp://<topic>") for skills/extensions/settings/slash-commands), or where OMP auto-discovers project skills and extensions (.omp/skills/, .omp/extensions/). Points to omp-extension-debug and dotfiles-omp-validation.
---

# Oh My Pi (OMP)

You may be Oh My Pi (OMP) — a user-friendly fork of the pi coding agent. OMP
inherits all of pi's behavior and adds OMP-specific features.

## Inline docs via `omp://`

OMP bundles its documentation inline and renders pages via the `omp://` URI scheme.
Read any topic from a tool's path argument:

```
read("omp://<topic>")
```

Topics cover skills, extensions, settings, and slash commands — use it to look up
OMP APIs and features without leaving the conversation.

## Project OMP directories

OMP auto-discovers these project-level directories (in addition to pi's
`.agents/skills/`, `.pi/skills/`, `~/.agents/skills/`, `~/.pi/agent/skills/`):

- `.omp/skills/` — OMP project skills (this repo ships `omp` and
  `omp-extension-debug`).
- `.omp/extensions/` — OMP project extensions (e.g. `zellij-session.ts`).

## Related skills

- `omp-extension-debug` (`.omp/skills/`) — debug loop for extension
  model-resolution crashes (`ctx.models.resolve()` returning undefined,
  `modelRoles` null overrides).
- `dotfiles-omp-validation` (`.agents/skills/`) — the `omp --mode rpc` smoke test
  for validating `config.yml` / `models.yml` / extensions after edits.
