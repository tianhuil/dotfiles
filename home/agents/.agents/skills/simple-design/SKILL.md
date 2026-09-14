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

Use plain language and avoid jargon unless the jargon is necessary. Define each term before using it. After defining a term, use that same term consistently; do not replace it with synonyms, because synonyms can create ambiguity. For every unresolved question or decision, add an inline TODO at the point where it must be resolved. Write each TODO as a question in this exact form: `[TODO: what is the ...?]`.

State:

- what is in scope and explicitly out of scope;
- the relevant terminology and invariants;
- the highest existing seam to test;
- the component that owns each important behavior;
- the source of truth for configuration or data; and
- any assumptions that need confirmation.

Use an inline TODO at the decision point when a question or decision remains unresolved:

`[TODO: what is the decision between A and B, and why?]`

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

Each criterion must describe externally visible behavior and a concrete proof:

- [ ] `<named input>` produces `<observable result>`; verified by `<test or command>`.
- [ ] Invalid or missing input produces `<named error or behavior>`; verified by `<test or command>`.
- [ ] The focused test crosses the intended boundary rather than only calling an internal implementation.
- [ ] Documentation and code agree.

If there is a fixed set of cases, list every case by stable name. Do not derive the set from whatever the implementation happens to expose.

## Failure and Assumption Notes

For this feature, state what happens when relevant dependencies are unavailable, input is invalid, or evidence is inconclusive. Label a case `blocked`, `unsupported`, or `inconclusive` only with a reason and proof; state whether the label blocks completion.

Record external assumptions with their version and a probe or authoritative source. If the feature has modes, include a compact table of mode behavior, defaults, invalid values, and precedence.

## Boundaries

- ✅ **Always:** run focused tests; use the existing seam; update the design when a requirement changes.
- ⚠️ **Ask first:** add dependencies, change persistent data, alter public APIs, or expand scope.
- 🚫 **Never:** commit secrets, claim an untested case passes, or silently replace the required integration with a substitute.

## Final Check

Before approval, confirm:

- the outcome is observable and reproducible;
- every important contract has an example;
- ownership, source of truth, and verification are clear;
- required cases are named;
- relevant failure states and assumptions are classified; and
- the acceptance criteria pass without relying on self-comparison.

For a simple design, a second-agent review is optional. Use the large-design format when any criterion is difficult to answer or the feature has cross-system, generated-data, security, evidence, multi-mode, or multi-session risk.

## Output

Save the document as `notes/design/[feature-name]-design.md` in kebab-case. Keep it concise, self-contained, and under 200 lines.
