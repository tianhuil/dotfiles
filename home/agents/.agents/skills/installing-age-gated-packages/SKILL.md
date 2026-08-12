---
name: installing-age-gated-packages
description: >-
  Installs the latest version of an npm package that satisfies bun's
  `minimumReleaseAge` constraint from `~/.bunfig.toml`. Use when `bun install -g
  <package>` fails with "published within minimum release age" errors, or when
  upgrading tools like opencode. Supports installing via pnpm too.
---

# Installing Age-Gated Packages

Bun's `minimumReleaseAge` blocks packages published too recently. This script
finds the newest version that passes the gate and installs it via `bun` or
`pnpm`.

## Usage

The installer lives at `scripts/install.py` (relative to this skill's directory). Run it with `--help` to see all options:

```bash
python3 SKILL_DIR/scripts/install.py --help
```

### Install via bun (default)

```bash
python3 SKILL_DIR/scripts/install.py <package>
```

### Install via pnpm

```bash
python3 SKILL_DIR/scripts/install.py <package> --pm pnpm
```

### Example: upgrade opencode

```bash
python3 SKILL_DIR/scripts/install.py opencode-ai
```

## How it works

1. Reads `minimumReleaseAge` (seconds) from `~/.bunfig.toml`. If absent, installs the latest version directly.
2. Queries `npm view <package> time --json` for every version's publish time.
3. Picks the newest version older than `now - minimumReleaseAge`.
4. Installs `<package>@<version>` globally with the chosen package manager.

## Fallback one-liner (no script access)

When you cannot reach `scripts/install.py`, this inline command achieves the same result for a hard-coded 7-day (604800s) gate:

```bash
python3 -c "
import json, subprocess, time, datetime
d=json.loads(subprocess.run(['npm','view','opencode-ai','time','--json'],capture_output=True,text=True).stdout)
c=time.time()-604800
v=sorted([(v,t) for v,t in d.items() if t!='unpublished' and datetime.datetime.fromisoformat(t.replace('Z','+00:00')).timestamp()<c],key=lambda x:x[1])[-1][0]
subprocess.run(['bun','install','-g',f'opencode-ai@{v}'])
"
```
