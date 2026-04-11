---
name: commander-js
description: "Non-obvious best practices for building CLIs with commander.js in Node.js. Use when writing or reviewing commander.js option/argument definitions, parsers, subcommands, testing, or help customization. Covers the Option class fluent API, custom parsers, Infinity sentinel, env binding, conflicts/implies, exitOverride for testing, getOptionValueSource, optsWithGlobals, passThroughOptions, and more."
---

# Commander.js Non-Obvious Best Practices

## Option Signatures — Know Both Forms

`.option()` has two distinct signatures:

```js
.option(flags, description, defaultValue)
.option(flags, description, parserFn, defaultValue)
```

The parser function is the **3rd argument**, default is **4th**. This is easy to get wrong.

```js
// ✅ Correct — parser 3rd, default 4th
program.option('-n, --max-results <n>', 'max results', myParser, Infinity);

// ❌ Wrong — default accidentally treated as parser
program.option('-n, --max-results <n>', 'max results', Infinity);
```

---

## Infinity Sentinel for "No Limit" Args

When an option can mean "no limit", use `Infinity` as both the default and the parsed sentinel:

```js
import { InvalidArgumentError } from 'commander';

program.option(
  '-n, --max-results <number>',
  'max results to return (use "all" for no limit)',
  (val) => {
    if (val === 'all' || val === 'infinity') return Infinity;
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) throw new InvalidArgumentError('Must be a positive integer or "all"');
    return n;
  },
  Infinity  // default: no limit
);
```

`Infinity` composes naturally with JS array/iteration idioms:

```js
const results = items.slice(0, opts.maxResults);   // slice(0, Infinity) = all
if (results.length < opts.maxResults) { /* done */ }
```

Document the sentinel in the description string so it shows in `--help`.

---

## Prefer `addOption(new Option(...))` for Rich Options

The `Option` class unlocks a fluent API not available via `.option()`:

```js
import { Option } from 'commander';

program
  .addOption(new Option('-p, --port <number>', 'port number').env('PORT'))
  .addOption(new Option('-d, --drink <size>', 'drink size').choices(['small', 'medium', 'large']))
  .addOption(new Option('-t, --timeout <delay>', 'timeout in seconds').default(60, 'one minute'))
  .addOption(new Option('--donate [amount]', 'optional donation').preset('20').argParser(parseFloat))
  .addOption(new Option('--disable-server', 'disables the server').conflicts('port'))
  .addOption(new Option('--free-drink', 'small drink free').implies({ drink: 'small' }))
  .addOption(new Option('-s, --secret').hideHelp());
```

### Key `Option` methods:

| Method | Purpose |
|---|---|
| `.env('VAR')` | Fall back to env var if flag not provided |
| `.choices([...])` | Enforce allowed values; shown in `--help` |
| `.default(val, 'description')` | Default with human-readable label in help |
| `.preset(val)` | Value used when optional-arg flag is given bare (`--donate` with no amount) |
| `.conflicts('other')` | Error if both options are set |
| `.implies({ key: val })` | Auto-set another option when this one is used |
| `.hideHelp()` | Hide from help output (e.g. internal/debug flags) |
| `.argParser(fn)` | Equivalent to parser in `.option()` |
| `.makeOptionMandatory()` | Equivalent to `.requiredOption()` |

---

## `.env()` Priority Order

Env vars are only applied if the option value is currently `undefined`, `'default'`, `'config'`, or `'env'`. CLI flags always win. This means:

```js
// PORT=9000 node app.js --port 3000
// → opts.port === 3000  (CLI wins)

// PORT=9000 node app.js
// → opts.port === 9000  (env used)
```

Combine `.env()` with `.choices()` to validate env var values too — Commander validates both sources.

---

## Detect Where a Value Came From

Use `getOptionValueSource(key)` to distinguish user-supplied CLI flags from defaults or env vars. Values are `'default'`, `'env'`, `'cli'`, or `'config'`.

```js
program.parse();
const source = program.getOptionValueSource('port');
// 'cli'     → user passed --port
// 'env'     → came from PORT env var
// 'default' → no input, using default

// Useful for: config file merging (only override with explicit CLI values)
const merged = { ...configFileDefaults };
for (const [key, val] of Object.entries(program.opts())) {
  if (program.getOptionValueSource(key) === 'cli') {
    merged[key] = val;  // only override if user explicitly passed it
  }
}
```

For subcommand programs, use `getOptionValueSourceWithGlobals(key)` to search up the command hierarchy.

---

## `optsWithGlobals()` for Subcommands

In a subcommand's action handler, `opts()` only returns local options. Use `optsWithGlobals()` to merge parent options:

```js
program
  .option('--verbose', 'verbose logging')
  .command('deploy')
  .option('--env <name>', 'target environment')
  .action(function() {
    // ❌ this.opts() → { env: 'prod' }  (missing --verbose)
    // ✅
    const opts = this.optsWithGlobals();
    // → { verbose: true, env: 'prod' }
  });
```

---

## Async Action Handlers → `parseAsync`

If **any** action handler is async, use `parseAsync`:

```js
program.command('deploy').action(async (opts) => {
  await deployToCloud(opts);
});

await program.parseAsync(process.argv);
// ✅ Errors in async handlers are propagated
// ❌ .parse() silently drops them
```

---

## Testing: `exitOverride()` + `parse(['node', 'app', ...], { from: 'user' })`

Commander calls `process.exit()` on errors and `--help`. Use `.exitOverride()` to throw instead, enabling unit tests without spawning a subprocess:

```js
import { Command } from 'commander';

test('rejects unknown option', () => {
  const program = new Command();
  program.exitOverride().option('--port <n>', 'port', parseInt);

  expect(() => {
    program.parse(['node', 'app', '--unknown'], { from: 'node' });
  }).toThrow(expect.objectContaining({ code: 'commander.unknownOption' }));
});
```

Pass args as `{ from: 'user' }` to omit the `node`/script prefix boilerplate:

```js
program.parse(['--port', '3000'], { from: 'user' });
```

Common error codes: `commander.unknownOption`, `commander.unknownCommand`, `commander.missingArgument`, `commander.invalidArgument`, `commander.helpDisplayed`.

---

## `--no-*` Flags Are Free

Prefixing a flag with `--no-` automatically creates a boolean that defaults to `true` and flips to `false` when passed:

```js
program.option('--no-color', 'disable color output');
// opts.color === true   (default)
// --no-color → opts.color === false
```

No extra code needed. The property name is the part after `--no-` (`color`, not `noColor`).

---

## Dash-Separated Names → camelCase

Commander auto-converts `--max-results` to `opts.maxResults`. Always define options with dashes in the flag string and access them via camelCase in code:

```js
program.option('--max-results <n>', '...', parseInt);
// opts.maxResults, not opts['max-results']
```

---

## `passThroughOptions()` for Wrapper CLIs

When building a CLI that wraps another tool (e.g. `mytool run -- npm test`), use `.passThroughOptions()` to stop Commander consuming downstream flags:

```js
program
  .enablePositionalOptions()
  .command('run')
  .passThroughOptions()
  .argument('<cmd...>')
  .action((args) => {
    spawn(args[0], args.slice(1));
  });

// mytool run --port 80 npm test
// → Commander sees --port 80, passes 'npm test' through
```

Without this, `npm`'s flags would be consumed or error.

---

## `showHelpAfterError()` for Better UX

Show help automatically on parse errors:

```js
program.showHelpAfterError('(add --help for additional information)');
```

Or show full help:

```js
program.showHelpAfterError();
```

---

## `default(val, label)` for Non-Obvious Defaults

When the default value isn't self-explanatory (e.g. `60` seconds), provide a human label shown in `--help`:

```js
new Option('-t, --timeout <ms>', 'request timeout').default(60000, '60 seconds')
// help shows: (default: 60 seconds) — not: (default: 60000)
```

---

## `optionsGroup()` for Help Organization

Group related options under headings in help output:

```js
program
  .optionsGroup('Output Options:')
  .option('--json', 'output as JSON')
  .option('--quiet', 'suppress output')
  .optionsGroup('Connection Options:')
  .option('--host <h>', 'hostname')
  .option('--port <n>', 'port', parseInt);
```

---

## Structure: Separate Definition from Execution

Keep option/command definitions separate from business logic for testability:

```js
// cli.js — definition only
import { buildProgram } from './program.js';
const program = buildProgram();
program.parseAsync(process.argv);

// program.js — pure, importable, testable
export function buildProgram() {
  const program = new Command();
  program.exitOverride(); // safe for tests
  // ... add options, commands
  return program;
}
```

This lets tests import `buildProgram()` and call `.parse()` directly without spawning a child process.

---

## Quick Reference

```js
import { Command, Option, InvalidArgumentError } from 'commander';

const program = new Command();

// Numeric with Infinity sentinel
program.option('-n, --max-results <n>', 'max (use "all" for unlimited)',
  (v) => v === 'all' ? Infinity : parseInt(v, 10), Infinity);

// Rich option via Option class
program.addOption(
  new Option('-p, --port <n>', 'port').env('PORT').default(3000, '3000').argParser(Number)
);

// Mutual exclusion
program.addOption(new Option('--json').conflicts('pretty'));

// Implied options
program.addOption(new Option('--trace').implies({ verbose: true }));

// Detect source (cli vs default vs env)
const src = program.getOptionValueSource('port'); // 'cli' | 'env' | 'default'

// Async + testing
program.exitOverride();
await program.parseAsync(['--port', '8080'], { from: 'user' });
```