---
name: biome-oom-prevention
description: Diagnose Biome out-of-memory failures. Use when a lint, format, check, or ci run reports out of memory, "terminated abnormally", exit 254, a killed process, or runaway memory, or when Biome hangs scanning generated files.
---

# Biome without OOM

First prove Biome is the process that failed; a command wrapper often fakes the symptom. Then treat OOM as a **scan-boundary** bug: Biome is usually parsing files it should never see. Keep the scan tight, then profile what remains.

## Workflow

1. **Prove the failure is Biome's.** `[warn] Linter process terminated abnormally (possibly out of memory)` and exit 254 come from rtk, not Biome. rtk rewrites agent commands such as `pnpm lint` and `biome check .` to `rtk lint`, which drops the linter name, runs ESLint or a tool named after the subcommand, and reports the resulting "command not found" as a crash (rtk-ai/rtk#2879).
   - Run `rtk rewrite "<command>"`. Any output means rtk rewrote it; rerun as `RTK_DISABLED=1 <command>` and use that result. A pass ends this skill; fix the rewrite with `exclude_commands` in `~/.config/rtk/config.toml`.
   - Measure peak memory with `/usr/bin/time -v <command>` (`Maximum resident set size`). Continue only when Biome itself reports memory exhaustion, the kernel kills it (exit 137, or an OOM-killer line in `dmesg`), or its peak memory grows with the scan.
2. **Identify command and scope.** Record Biome version, working directory, command, repository size, and whether failure occurs in `lint`, `format`, `check`, or `ci`. Run `biome --version` and the exact command with an explicit path when possible.
3. **Inspect boundaries before rules.** Read `biome.json`/`biome.jsonc`, `.gitignore`, workspace config, and package scripts. Look for broad `.` or `**` scopes and generated trees: `node_modules`, `.next`, `dist`, `build`, `.turbo`, `out`, coverage, caches, vendored code, snapshots, and generated clients.
4. **Make ignores explicit.** Keep build and dependency directories out of both the CLI scan and version control. Prefer Biome's current `files.includes` negation syntax for the installed version; use `!!` when the directory must be excluded from every tool, and verify syntax against `biome --help` or the installed schema. Do not paste a config from another Biome major version without checking it.

   Example for Biome versions supporting negated `files.includes`:

   ```json
   {
     "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
     "files": {
       "ignoreUnknown": true,
       "includes": [
         "**",
         "!!**/node_modules/**",
         "!!**/.next/**",
         "!!**/dist/**",
         "!!**/build/**",
         "!!**/.turbo/**",
         "!!**/out/**",
         "!!**/coverage/**"
       ]
     },
     "vcs": {
       "enabled": true,
       "clientKind": "git",
       "useIgnoreFile": true
     }
   }
   ```

   Use the repository's existing schema URL and conventions. Add matching `.gitignore` entries; VCS integration is a second boundary, not a replacement for explicit Biome exclusions.
5. **Narrow the command.** Prefer Biome's VCS filters over scanning `.` when checking a subset: `biome check --staged` for pre-commit work, or `biome check --changed --since=<REF>` for committed changes since a base ref. `--changed` excludes staged and unstaged changes; `--staged` is unavailable with `biome ci`. Check exact behavior for installed version with `biome check -h` (or `biome lint -h`). Otherwise test a source directory or changed-file list. In a monorepo, run each package from its own Biome project or pass package paths. Avoid linting output while a build is writing it.
6. **Remove graph multipliers.** If memory remains high, temporarily disable experimental project-wide type or graph analysis and project rules, then rerun the same command. Re-enable one feature at a time after the scan is stable. Do not hide real lint failures by disabling ordinary rules.
7. **Profile with supported logging.** Check available flags first:

   ```bash
   biome lint --help | grep -E 'log-(level|kind|file)'
   ```

   Use a log path outside the scanned tree. Current Biome releases commonly support `debug`, not `tracing`:

   ```bash
   log_file="${TMPDIR:-/tmp}/biome-lint.jsonl"
   biome lint --log-level=debug --log-kind=json --log-file="$log_file" src
   ```

   If help lists `tracing`, use it instead of `debug`. Never place the log file under the repository when `files.includes` can match it; otherwise Biome may lint its own JSON log. Inspect the log for workspace insertion, file discovery, and unusually large files. Confirm suspected files with `du -sh` and `find`.
8. **Validate the fix.** Run the original command and a targeted command. Confirm excluded paths are absent from diagnostics/logs, peak memory no longer grows with generated output, and source files still receive expected lint/format checks. Report version, changed config, command, and residual risk.

## Guardrails

- Keep `node_modules` and generated output outside Biome's scan. Do not solve OOM by raising memory limits first.
- Treat `files.includes` syntax as version-sensitive. A config that parses but changes inclusion semantics can silently reintroduce OOM.
- `ignoreUnknown` controls unknown file types; it does not exclude known JavaScript, TypeScript, JSON, CSS, or generated files.
- `.gitignore` integration filters ignored paths, but explicit Biome exclusions make expensive boundaries visible and resilient.
- Separate CLI scan problems from editor/LSP watcher problems. This skill covers CLI and repository configuration; do not prescribe editor restart steps as the fix.

## Completion criterion

Finish only when the failure is shown to be Biome's own (or the wrapper is fixed and the command passes), the failing command has been reproduced or bounded, every large generated/dependency path is accounted for, logging uses flags supported by the installed Biome version, and a repeat run shows stable memory with intended source coverage.
