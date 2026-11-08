---
name: backpass
description: >-
  Tune AGENTS.md, CLAUDE.md, and skills from past agent session transcripts with
  the backpass CLI. Use when the user asks to improve, prune, or audit agent
  instructions with evidence from real sessions, or names backpass.
---

# backpass

[backpass](https://github.com/kunchenguid/backpass) reads past agent sessions from disk, scores how each instruction in the memory file fared, and proposes a few small edits, each backed by verbatim quotes from at least two sessions. The user is the gate: `backpass apply` is the only command that writes.

## 1. Prerequisites

Needs Node ≥ 22.5, `backpass` and `acpx` on PATH, and `lavish-axi` for the browser review page (`--no-ui` works without it). Install missing ones with the `installing-age-gated-packages` skill, because `~/.bunfig.toml` blocks releases newer than 7 days.

Done when `backpass --help` and `acpx --version` both run.

## 2. Pick the scope

- **Project**: run from the repo root. Trains the first existing of `AGENTS.md` / `CLAUDE.md`, plus skills in `skillsDir` (default `.agents/skills`).
- **User**: add `--scope user`. Trains `~/.claude/CLAUDE.md` from Claude Code and Codex sessions across all projects.

User scope writes through Stow links. `~/.claude/CLAUDE.md` resolves to the Host Clone `~/dotfiles/home/pi/.pi/agent/AGENTS.md`, and new user-level skills land in `~/.agents/skills/`, outside the repo. So in user scope, preview with `backpass apply --dry-run`, then port each edit the user accepts into the workspace source: `dotfiles/home/pi/.pi/agent/AGENTS.md`, and skills into `dotfiles/home/agents/.agents/skills/<name>/`. Deploy as `dotfiles/AGENTS.md` describes.

## 3. Propose

```sh
backpass init   # once per scope: writes .backpassrc.json, git-excludes .backpass/
backpass        # collect sessions → score → propose; never writes
backpass status # cache, failed transcripts, budget bars
```

A run makes up to 100 cheap-model calls plus one high-effort call through the harnesses the user is logged into. See `backpass --help` for sampling and strictness flags.

Done when the run prints a proposal, or reports nothing to propose.

## 4. Apply (the human gate)

Show the user each proposed edit with its evidence quotes. The user decides every edit:

- `backpass apply`: browser review page with ACCEPT / REJECT per edit.
- `backpass apply --no-ui`: the same review in the terminal.
- `backpass apply --decisions "e1=accepted e2=rejected:too-narrow"`: carries exactly the verdicts the user stated in chat.

Rejections are remembered, so a rejected edit stays rejected until more sessions back it.

Done when apply reports the written edits, or the user has rejected them all.
