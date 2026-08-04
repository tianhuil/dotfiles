# Pi Agent Context Budget: What's Eating the Context Window

**Created**: 2026-08-04
**Method**: Measured the serialized payloads pi actually sends to the model — tool definitions from pi's compiled dist (`dist/core/tools/*.js`) and extension sources (`pi-subagents`, `pi-web-access`), skill catalog via `formatSkillsForPrompt` in `dist/core/system-prompt.js`, and the AGENTS.md project context file.
**Tools analyzed**: pi-coding-agent 0.80.3, pi-subagents, pi-web-access, 28 loaded skills.

## Executive Summary

- The **12 loaded tool definitions total ~39,900 chars**; the `subagent` tool alone is **25,467 chars (64% of all tool payloads)**.
- Only skill **descriptions** are loaded into context (verified in `system-prompt.js`); the 28 SKILL.md bodies (~330K chars) stay on disk until read on demand.
- The **skills catalog block is ~19,900 chars** (descriptions + names + locations + XML tags).
- **AGENTS.md project context is 8,215 chars**.
- **Base system prompt template is ~1,700 chars**.
- Grand total of measured static context: **~70,000 chars** (~35K tokens), before any conversation history.

## Tool Payload Breakdown

Serialized as `{name, description, parameters}` — the exact shape the model receives:

| Tool | Total chars | Description | Schema |
|------|------------:|------------:|-------:|
| subagent | **25,467** | 9,383 | 15,732 |
| web_search | 3,939 | 1,533 | 2,348 |
| fetch_content | 2,186 | 369 | 1,758 |
| subagent_wait | 2,022 | 1,327 | 629 |
| source_check | 1,494 | 119 | 1,321 |
| edit | 1,206 | 326 | 834 |
| read | 653 | 303 | 304 |
| bash | 511 | 248 | 217 |
| subagent_supervisor | 414 | 130 | 223 |
| write | 399 | 127 | 225 |
| intercom | 372 | 99 | 223 |
| get_search_content | 1,232 | 120 | 1,052 |
| **TOTAL (12 tools)** | **39,895** | | |

### Root cause of subagent's size

The 15,732-char schema is inflated by **fully duplicated nested objects**:
- `tasks[].task` repeats the entire child-task schema inline (agent, cwd, count, output, reads, model, skill, toolBudget, acceptance, …)
- `chain[].parallel[].task` repeats it *again* inside the chain step schema
- `chain[].parallel[]` also nests full step schemas per item

Every child task spec re-serializes the whole nested schema, so the schema grows roughly with the square of the feature set. This is the single biggest lever for reclaiming context.

## Skills Catalog

Verified in `dist/core/system-prompt.js` → `formatSkillsForPrompt(skills)`: **only name, description, and location are injected** — not SKILL.md bodies. Confirmed: the 28 SKILL.md files total 330,503 chars but contribute only ~12,376 chars of descriptions to context.

| Component | Chars |
|-----------|------:|
| 28 skill descriptions | 12,376 |
| 28 skill names | 337 |
| locations + XML tags | ~7,200 |
| **Skills block total** | **~19,900** |

Largest skill descriptions:

| Skill | Description chars |
|-------|------------------:|
| xlsx | 948 |
| find-docs | 876 |
| serena | 863 |
| docx | 835 |
| orca-cli | 706 |
| pptx | 732 |
| agent-browser | 488 |
| gh-grep | 455 |
| doc-coauthoring | 428 |
| pdf | 437 |

## Other Components

| Component | Chars |
|-----------|------:|
| Base system prompt template | 1,699 |
| AGENTS.md project context (this repo) | 8,215 |
| Current date / cwd line | ~60 |

## Grand Total

| Bucket | Chars | ~Tokens (est. 2 chars/token) |
|--------|------:|------------------------------:|
| **Tools** | **39,895** | ~20K |
| **Skills catalog** | **~19,900** | ~10K |
| AGENTS.md | 8,215 | ~4K |
| Base prompt | 1,699 | ~850 |
| **Static total** | **~70,000** | **~35K** |

## Recommendations (by impact)

1. **Shrink the `subagent` schema** (25.5K → potential ~10K): deduplicate nested task schemas via `$ref`/`defs`, or flatten `tasks[]`/`chain[].parallel[]` into single `anyOf` object variants instead of duplicating inline.
2. **Trim longest skill descriptions** (xlsx 948, find-docs 876, serena 863): descriptions are trigger text; 900+ chars each is over-engineered for discovery.
3. **AGENTS.md is ~4K tokens** — reasonable, but the setup_skills/RPC sections are rarely relevant to normal sessions and could move to a `notes/` doc referenced only when needed.
4. Conversation history and tool-call results (not measured here) will dominate as a session progresses — the static 35K baseline matters most for short sessions.
