# Research: skill discovery verification

Evidence for the rules in [SKILL.md](SKILL.md). Read only when changing this skill or investigating discovery behavior. Re-run anything with `tests/skill-claims-test.sh`.

Verified against pi 1.5.2 (installed dist source: `dist/core/skills.js`, `dist/core/package-manager.js`) and Claude Code 2.1.322 (empirical CLI runs only). Behavior may drift; the test script is the source of truth.

## Claim matrix (2026-11-11)

| ID | Claim | Result |
|----|-------|--------|
| p1 | pi discovers `.agents/skills/<sub>/<name>/SKILL.md` recursively | PASS |
| p2 | in-tree `.agents/skills/.gitignore` (`*` + `!local/` + `!local/**`): vendor invisible to pi, `local/` + `skills-lock.json` trackable in git | PASS |
| p3 | dir with `SKILL.md` is a skill root; pi does not recurse below it | PASS |
| p4 | pi ancestor walk stops at git repo root; without a repo walks to fs root | PASS |
| p5 | repo-root `.gitignore` does not affect pi skill discovery | PASS |
| p6 | `pi --skill <path>` loads a skill the in-tree ignore file hides | PASS |
| p7 | name collision: exactly one skill kept, first scanned wins | PASS |
| c1 | claude discovers flat `.claude/skills/<name>/` | PASS |
| c2 | claude does NOT discover `.claude/skills/<sub>/<name>/` (one level only) | PASS |
| c3 | claude follows `.claude/skills/<name>` symlink into `.agents/skills/local/` | PASS |
| c4 | claude does not read project `.agents/skills/` (needs symlink) | PASS |
| c5 | claude ignores `.gitignore` for skills (ignored skill still loads) | PASS |
| s1 | `npx skills experimental_install` plans restore from `skills-lock.json` (online) | PASS |

Detection method: pi — skills section of the system prompt in the newest session jsonl under `~/.pi/agent/sessions/`; claude — `skill_listing` attachment in the newest jsonl under `~/.claude/projects/<cwd with / and . mapped to ->`.

## CLAUDE.md pointer experiments (2026-11-11)

Question: can a small `CLAUDE.md` pointing at `AGENTS.md` and `.agents/skills/` replace duplicated instructions and per-skill symlinks? Sandbox git repo, `claude -p`, deterministic markers in `AGENTS.md` and two probe skills.

| Run | Setup | Prompt | Followed? |
|-----|-------|--------|-----------|
| A | no CLAUDE.md | "What is the project status word?" (answer defined in AGENTS.md) | YES — Claude Code 2.1.322 reads `AGENTS.md` natively |
| B | no CLAUDE.md | "Activate the sc-follow-probe skill…" (skill named) | YES — read `.agents/skills/local/…/SKILL.md` and followed it incl. `marker.txt` |
| C | no CLAUDE.md | "Do the probe-skill activation check" (name hints, not exact) | YES — found and followed via exploration |
| D/D2 | CLAUDE.md pointer | same as C | YES — `PROBE-SKILL-FOLLOWED MARKER-7f3a` |
| E | no CLAUDE.md | strict variant of C | YES |
| F1 | CLAUDE.md pointer | description-only task ("assess… gate a release"), no skill nudge | NO — generic answer, skill not activated |
| F1' | CLAUDE.md pointer | same + "Follow any applicable project skill" | YES — `AUDIT-GATE-OK 5` |
| F2 | no CLAUDE.md | same as F1' | YES — `AUDIT-GATE-OK 4` |

Conclusions:

- Claude reads `AGENTS.md` natively → never duplicate instructions in `CLAUDE.md`.
- Skills under `.agents/skills/` are followed whenever the model can find them (named, hinted, or nudged), pointer or not. The pointer is a cheap discovery hint, not a guarantee.
- Implicit routing (task matches only the skill description) failed even with the pointer (F1). Only the flat `.claude/skills/<name>` symlink puts a skill in Claude's `skill_listing` for automatic activation.

## References

- [Agent Skills specification](https://agentskills.io/specification)
- [Pi skills docs](https://pi.dev/docs/latest/skills)
- [Claude Code skills docs](https://code.claude.com/docs/en/skills)
- [Anthropic skills collection](https://github.com/anthropics/skills)
- [skills CLI (`npx skills`, owns `skills-lock.json`)](https://github.com/vercel-labs/skills)
