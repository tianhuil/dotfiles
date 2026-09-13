---
name: design
description: Design a feature and write a machine-parseable design document to notes/design/ for human review and agent execution. Use when planning a new feature, drafting a PRD/SRS-style spec, or producing a design doc before implementation.
metadata:
  audience: developers
  workflow: design
---

# Design

Choose the smallest design workflow that makes the work deterministic. Designs are living contracts: an independent implementer should know what to build, an independent reviewer should know how to verify it, and acceptance should fail when required work is absent.

## Choose a format

Use [`../simple-design/SKILL.md`](../simple-design/SKILL.md) when **all** of these are true:

- one component or one existing seam contains the change;
- the work fits one implementation session and one owner;
- there are no external integrations, generated artifacts, imported evidence, persistent-data changes, or security-sensitive claims;
- there are few cases and no meaningful mode or compatibility matrix; and
- a focused test can independently prove the observable behavior.

Use [`../large-design/SKILL.md`](../large-design/SKILL.md) when **any** of these are true:

- multiple components, teams, sessions, agents, worktrees, or tickets are involved;
- the change crosses a public API, process, service, deployment, or integration boundary;
- external versions, configuration, network, platform, vendor behavior, or security assumptions matter;
- generated files, fixtures, captured data, migrations, or other evidence need provenance or drift rules;
- the required cases form a matrix, include multiple modes, or could be silently omitted;
- a false-green acceptance result could hide missing behavior, data-integrity risk, or an unsafe claim; or
- ownership, source of truth, failure classification, or completion cannot be stated compactly.

When uncertain, choose the large format. Do not force a large feature into the simple format merely to keep the document short. A simple design may be upgraded to a large design when exploration reveals a trigger above. Run the selected skill as a separate skill so its scope and context remain clear.

## Shared output rules

Both formats:

- start with the user problem, users, observable outcomes, success measures, and explicit exclusions;
- use repository facts, existing seams, domain terminology, ADRs, configuration, and test commands before writing decisions;
- use exact examples for important contracts and inline TODOs only for genuine user decisions;
- pair every implementation step with a clear, checkable completion criterion;
- state the highest useful test seam and verify external behavior rather than implementation details;
- distinguish required behavior from follow-ups; and
- use the three-tier boundaries: Always, Ask first, Never.

Write the resulting document to `notes/design/[feature-name]-design.md` using kebab-case. Keep simple documents under 200 lines and large documents under 300 lines.

## Review choice

A focused self-check is sufficient for a low-risk simple design. Use an independent adversarial reviewer for every Critical/High-risk large design. The reviewer should attack ambiguity, missing cases, false-green paths, circular gates, silent skips, contradictory modes, unverified assumptions, unstable evidence, and design/code drift. This is separate from later implementation code review: code review cannot prove that the original design was complete.
