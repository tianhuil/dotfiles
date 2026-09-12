# Design Skill Update Report

## Summary

Split the design workflow into two formats and turned `SKILL.md` into the selector:

- `home/agents/.agents/skills/design/simple-design/SKILL.md`
- `home/agents/.agents/skills/design/large-design/SKILL.md`
- `home/agents/.agents/skills/design/SKILL.md` (selector and shared rules)

## Selection criteria

The main skill selects the simple format only when the change is local to one component/seam, fits one session and owner, has no external or generated-data risk, has few cases, and has a focused independent test.

It selects the large format when any cross-system, multi-session, external-dependency, generated-artifact, evidence, security, mode-matrix, omission, false-green, or ownership/source-of-truth risk exists. When uncertain, it chooses large.

## Simple format

`simple-design/SKILL.md` keeps the useful original PRD shape—summary, user stories, technical design, implementation plan, acceptance criteria, and boundaries—but adds lightweight versions of the research recommendations:

- observable outcomes and reproducible verification;
- ownership and source-of-truth table;
- exact contract examples;
- named required cases;
- relevant failure and external-assumption notes;
- compact mode guidance; and
- a final completeness check.

It remains intentionally concise, has a 200-line cap, and makes second-agent review optional.

## Large format

`large-design/SKILL.md` contains the former expanded design skill nearly unchanged, with explicit contracts, ownership, required-case manifests, external-assumption registers, mode matrices, evidence/provenance policy, failure classifications, synchronization rules, bounded work units, adversarial review, completeness rules, and a fail-closed completion gate. It retains the 300-line cap.

## Adversarial review recommendation

Use an independent adversarial review agent for every Critical/High-risk large design. The reviewer attacks the design for ambiguity, missing cases, false-green acceptance, circular gates, silent skips, contradictory modes, unverified assumptions, unstable evidence, and design/code drift. This complements implementation code review, which cannot establish that the original design was complete.

## Validation

- `SKILL.md`: 51 lines.
- `simple-design/SKILL.md`: 100 lines.
- `large-design/SKILL.md`: 185 lines.
- All documents are below their stated caps.
- `git diff --check`: passed.
- No commit was created.
