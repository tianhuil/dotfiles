---
name: dotfiles-omp-validation
description: Validating Oh My Pi (OMP) config changes in the dotfiles repo via the `omp --mode rpc` smoke test. Use after editing config.yml, models.yml, or extensions to catch load errors, unrecognized models, or extension factory crashes before they silently break OMP. Covers the JSONL pipe command, the ready / extension_error / available_commands_update / prompt_result signals, and the --no-session / --cwd flags. See also the omp-extension-debug skill for extension model-resolution debugging.
---

# Oh My Pi (OMP) Config Validation via RPC

Changes to `config.yml`, `models.yml`, or extensions can silently break OMP
(load errors, unrecognized models, extension factory crashes). Validate with RPC:

```bash
# Pipe JSONL commands via stdin, capture all output
echo '{"id":"t1","type":"prompt","message":"/wt-build"}' | \
  omp --mode rpc --no-session --cwd /tmp > /tmp/rpc.jsonl

# Assertions
grep -q '"type":"extension_error"' /tmp/rpc.jsonl && echo "FAIL: extension error" || true
grep -q '"name":"wt-build"' /tmp/rpc.jsonl && echo "PASS: registered" || echo "FAIL: not found"
```

**Key signals** in the output:

| Frame | Meaning |
|-------|---------|
| `"type":"ready"` | Startup complete |
| `"type":"extension_error"` | **FAIL** — factory crashed |
| `"type":"available_commands_update"` | Startup burst includes all commands (no explicit `get_available_commands` needed) |
| `"prompt_result"` → `"agentInvoked": false` | Local-only command completed (no agent turn) |

**Critical flags:**
- `--no-session` — no session DB; startup faster, no stale state
- `--cwd /tmp` — isolates from project-level `.omp/extensions/` in the repo
- Use `--cwd <repo-root>` instead of `/tmp` when testing project-level config or extensions

`omp` reads JSONL from stdin sequentially. Startup frames emit *before* the first
stdin read, so piping one command at startup captures both the registration burst
and a handler smoke test in a single run. Pipe `echo` sends one frame then closes
stdin — omp sees EOF after processing it and exits cleanly.

> Extension-specific debugging (e.g. `ctx.models.resolve()` returning undefined,
> `modelRoles` null overrides) is covered by the `omp-extension-debug` skill (and
> general OMP orientation is in the `omp` skill, both under `.omp/skills/`).
