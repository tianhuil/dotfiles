# pi-dotenvx-guard

Pi extension that blocks direct access to dotenvx private-key files and provides a `dotenvx_info` tool for safe metadata.

## Protections

- Blocks `read`, `write`, and `edit` tool calls to `.env.keys` and configured protected paths.
- Blocks bash commands with obvious textual references to protected key filenames.
- Redacts recognizable dotenvx private-key values from tool results.
- Adds system guidance directing the model to `dotenvx_info`.
- `dotenvx_info` reports `.env*` filenames, public `APP_ENV`, encrypted-entry presence, and private-key file metadata (existence, size, modification time, entry count, and variable names). It never returns key values.

The extension loads optional `dotenvx-guard.json` beside its package and project overrides from `<project>/.pi/dotenvx-guard.json`. Supported properties are `protectedNames` and `protectedDirs`; defaults include `.env.keys` and `~/.dotenvx`.

Example:

```json
{
  "protectedNames": [".env.keys", "secrets.keys"],
  "protectedDirs": ["~/.dotenvx", "./private"]
}
```

## Limitations

Bash matching is advisory and bypassable (for example, indirect paths or encoded commands). It is not an OS security boundary. OS-level sandboxing that denies reads of key files is the robust follow-up. Redaction is also a backstop, not a substitute for preventing access. If a private key was already read or recorded in a session or Git history, this extension cannot undo that exposure; rotate the key and remove sensitive history as appropriate.

## Enable

Install this package as a Pi extension through Pi settings/packages, or load its entry point directly:

```sh
pi -e ./home/pi/.pi/agent/extensions/dotenvx-guard/src/index.ts
```

## Tests

From the repository root:

```sh
bun run typecheck
bun test home/pi/.pi/agent/extensions/dotenvx-guard/test/unit/
```

The extension package also defines `bun run test` and `bun run test:e2e` for the unit and Pi CLI smoke tests.
