---
name: simple-design
description: Design a small, low-risk feature with a concise contract, examples, ownership, verification, and acceptance criteria. Use when one component and one session can contain the work.
---

# Simple Design

Use this format for a small, low-risk feature that can be designed and implemented in one session.

## Executive Summary

Write one paragraph covering the problem, users, solution, observable success criteria, and scope boundary.

## User Stories

- As a `<user>`, I want `<action>`, so that `<benefit>`.

## Scope and Decisions

Apply [`../design/common-rules.md`](../design/common-rules.md).

State:

- what is in scope and explicitly out of scope;
- the relevant terminology and invariants;
- the highest existing seam to test;
- the component that owns each important behavior;
- the source of truth for configuration or data; and
- any assumptions that need confirmation.

## Technical Design

Describe the smallest design that satisfies the outcome. Include exact paths only when they are stable and useful. For every public input, output, file, or error, show a concrete example and state required fields, defaults, and allowed values.

### Architecture

[Components and the highest useful test seam]

### Contract Example

```json
{
  "example": "value"
}
```

### Ownership

| Behavior | Owner | Source of truth | Verification |
|----------|-------|-----------------|--------------|
| ... | ... | ... | ... |

## Implementation Plan

1. **Implement `<slice>`** — completion criterion: the observable behavior works and its focused test passes.
2. **Verify `<slice>`** — completion criterion: the required checks pass in a clean, reproducible setup.

Keep the plan narrow. Do not add abstractions, dependencies, or unrelated refactors without a stated requirement.

## Acceptance Criteria

Each criterion must describe externally visible behavior and how it is checked, using the typed `verify:` field from the common rules (`cmd:` wherever possible):

- [ ] A-01 `<named input>` produces `<observable result>` — verify: cmd: `<command>`
- [ ] A-02 Invalid or missing input produces `<named error or behavior>` — verify: cmd: `<command>`
- [ ] A-03 The focused test crosses the intended boundary and fails when the behavior is removed — verify: cmd: `<test command>` (also run once with the behavior removed)
- [ ] A-04 Documentation matches the implemented behavior — verify: review: the documented inputs, outputs, and errors match the code and tests

If there is a fixed set of cases, list every case by stable name. Do not derive the set from whatever the implementation happens to expose.

If the change is user-visible, add the **Acceptance Environment** and a short **Owner Acceptance Script** from the common rules (often one to three steps). Name any protected paths (tests or expected files the builder must not weaken).

## Failure and Assumption Notes

For this feature, state what happens when relevant dependencies are unavailable, input is invalid, or evidence is inconclusive. Label a case `blocked`, `unsupported`, or `inconclusive` only with a reason and proof; state whether the label blocks completion.

Record external assumptions with their version and a probe or authoritative source. If the feature has modes, include a compact table of mode behavior, defaults, invalid values, and precedence.

## Final Check

Before approval, confirm:

- the outcome is observable and reproducible;
- every important contract has an example;
- ownership, source of truth, and verification are clear;
- required cases are named;
- relevant failure states and assumptions are classified;
- every checklist item has a typed `verify:` (`cmd:` wherever the check can be automated) and no `[TODO:` markers remain;
- user-visible changes name where the owner will check them (Acceptance Environment); and
- the acceptance criteria pass without relying on self-comparison.

For a simple design, a second-agent review is optional. Use the large-design format when any criterion is difficult to answer or the feature has cross-system, generated-data, security, evidence, multi-mode, or multi-session risk.

