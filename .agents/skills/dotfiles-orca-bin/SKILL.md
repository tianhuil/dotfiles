---
name: dotfiles-orca-bin
description: The dotfiles repo's orca CLI wrapper at home/bin/.local/bin/orca (stowed to ~/.local/bin/orca). Use when editing that wrapper script or debugging why the `orca` command resolves (or fails) outside Orca's own terminals. Documents the resolution order ORCA_CLI_COMMAND -> Orca.app bundle (macOS) -> orca-ide (Linux) -> orca. Distinct from the global orca-cli usage skill.
---

# Orca CLI Bin

Orca's CLI is not on PATH outside Orca's own terminals, so the repo ships a
wrapper at `home/bin/.local/bin/orca` (stowed to `~/.local/bin/orca`). It resolves
the CLI per the orca-cli skill's order: `ORCA_CLI_COMMAND` → Orca.app bundle
(macOS) → `orca-ide` (Linux) → `orca`.
