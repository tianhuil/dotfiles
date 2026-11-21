---
name: cli-for-agents
description: Use when building, changing, or reviewing a CLI that agents run: its commands, `--help` text, output, errors, or the skill that teaches it.
---

# CLIs for agents

An agent learns a CLI from three places, in this order of weight:

1. **Behavior**: what the CLI prints, rejects, and exits with. This teaches on every call and can't drift.
2. **`--help`**: the reference. It is generated from the command definitions, so it stays current.
3. **The skill**: a one-page orientation that says when to reach for the CLI, its core workflows, and its gotchas, then points to `--help`.

Put each fact in exactly one of these. When a fact could live in code or in `--help`, put it there rather than in the skill.

## `--help`

Agents run `--help` first and copy examples more readily than they read option tables. Each level of help shows only that level.

**Top level (`tool --help`)**

- Every command has a one-line summary: a verb phrase that says what it does and its main side effect ("validate records against their schemas", "delete a record file"). A bare `list <table>` row is a defect.
- Shows the global options, then one line pointing to `tool <command> --help`.

**Each command (`tool <cmd> --help`)**

- A description of one to three sentences: what the command reads, what it writes, and what it prints.
- Every argument is explained: its format, and where valid values come from (for example, "a table name from `tool.config.yml`, or a path").
- Every option has a description, its default, and its choices.
- An `Examples:` block with 2–3 realistic, copy-pasteable invocations that cover the common case and the one gotcha.
- Exit codes and environment variables, if the command has any beyond the defaults.

**Optional**

- `tool help <topic>` for concepts that span commands, such as a data model or a config format.
- A machine-readable form (`--help --json` or `tool schema <cmd>`) when agents build calls from it.

With commander: `.summary()` sets the top-level line and `.description()` the full text. Use `.addHelpText('after', examples)`, `.showHelpAfterError()`, and `Option#default/choices/env` so the help is generated rather than written by hand.

## The skill

The skill holds what `--help` can't express:

- **Triggers**: when to use the CLI, and when to use something else (for example, "read `templates/` files directly; there is no command for them").
- **Workflows**: the 3–5 sequences that matter, written as commands in order.
- **Gotchas**: invariants and costly mistakes ("records change only through the CLI, so every write is validated"; "`null` is stored as a value; use `--unset` to remove a field").
- **The pointer**: "Run `tool <cmd> --help` for options and examples."

Option tables, the list of commands, and flag defaults stay in `--help`, because a copy in the skill is a cache that goes stale.

Ship the skill from the CLI (`tool skills`) or the package's `skills/` folder, so it is versioned with the binary. It holds no live state. Its description is a trigger: the task words an agent would see, in the third person.

## Behavior

**Output**

- Data goes to stdout. Progress, warnings, and errors go to stderr.
- Every read command has a machine format (`--format json|jsonl`) whose shape is stable: add fields, never rename or remove them. Keep box-drawing tables for the human default only.
- Default to a small schema (id plus 2–3 fields), and offer `--fields` and `--limit`. Print totals ("30 of 847").
- Make empty results explicit: `0 records in orders match status=open`, exit 0.
- After a write, print what changed (`updated orders/foo: status`), so the agent doesn't need a follow-up read.

**Input**

- Every input can be supplied with flags, arguments, or stdin. The CLI never prompts unless stdin is a TTY. Confirmations get `--yes`, and credentials come from environment variables or a file.
- Strict parsing: reject unknown options, extra arguments, unknown commands, and malformed values before touching anything. Commander 11 accepts excess arguments by default, so call `.allowExcessArguments(false)`. If the root command has its own action, it swallows typos such as `tool lsit`, so validate its arguments too.
- Treat arguments as untrusted. Resolve paths and keep them inside the project, and reject control characters and `..` in ids.

**Errors**

- Each error is one line naming what failed and the input that caused it, followed by the exact command that fixes it: `orders: unknown table; run tool check --fix`.
- Exit codes: 0 for success, including no-ops; 1 when the operation failed; 2 for a usage error (bad flag or argument). Document any other code in `--help`. Commander exits 1 on usage errors, so map its `CommanderError` to 2 in `.exitOverride()`.
- Translate stack traces and dependency errors into the CLI's own terms. Errors must not leak the internals of a wrapped tool.

**Writes**

- Idempotent: repeating a write that is already in effect is a no-op that exits 0 and says so.
- `--dry-run` for anything that deletes, renames many items, or costs money. It prints the planned change and exits with the same code the real run would.

**Grammar**

- One verb set across nouns (`list`, `get`, `create`, `update`, `delete`) and one name per concept across commands (`--format` everywhere, not `--output` in one place). An agent guesses an unseen command from the ones it has seen.
- `--version` is fast and prints only the version.

## Verify with a cold agent

Give a fresh agent only "`tool` is installed" and a real task, then read its transcript. Classify each stumble:

| Stumble | Fix |
| --- | --- |
| Guessed an option or command wrongly | Rename for consistency, or add an example |
| Repeated a call after an error | Put the fix command in the error |
| Parsed human output | Add or document `--format json` |
| Didn't know to use the CLI, or skipped a step | Sharpen the skill's trigger or workflow |
| Read a giant dump | Lower the default limit or fields |

You're done when a second cold run finishes the task with no stumbles.

## Review checklist

Run `tool --help` and `tool <cmd> --help` for every command, then check:

- [ ] Every command row in the top-level help has a summary.
- [ ] Every command has a description, explained arguments, described options, and an `Examples:` block.
- [ ] Unknown options, extra arguments, and command typos fail with exit 2 and a suggestion.
- [ ] Every error names the fix command.
- [ ] Every read command has a JSON format, and every write prints what changed.
- [ ] Nothing prompts when stdin isn't a TTY.
- [ ] The skill contains only triggers, workflows, gotchas, and the pointer to `--help`.
