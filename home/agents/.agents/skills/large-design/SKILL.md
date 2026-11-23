---
name: large-design
description: Design a large or high-risk feature with explicit contracts, ownership, manifests, evidence, independent review, and a fail-closed completion gate. Use when work crosses systems, sessions, agents, external dependencies, generated data, security boundaries, or large acceptance matrices.
metadata:
  audience: developers
  workflow: design
---

# Design

Create a design that an independent implementer can build, an independent reviewer can verify, and a deterministic gate can reject when incomplete. The design is a living contract, not a prose wish list.

## Process

### 1. Establish the brief and boundaries

Apply [`../design/common-rules.md`](../design/common-rules.md).

Use Plan Mode (read-only) first. Explore the repository before writing decisions. Mark genuine unresolved decisions with the shared TODO format.

Write:

- terminology and invariants; and
- assumptions requiring a version-, platform-, network-, or deployment-specific probe.

### 2. Design the contract at the highest useful seam

Prefer one existing, high-level seam over many new seams. For every requirement, specify all five properties:

1. **Observable** — what a user, caller, operator, dependent system, or reviewer sees, including side effects and error shape;
2. **Reproducible** — inputs, setup, environment, versions, timing, and command;
3. **Owned** — exactly one component, document, generator, or operator decides it;
4. **Enumerated** — the complete set of required cases and artifacts is named; and
5. **Gated** — a check fails when the requirement is absent, wrong, or incomplete.

Every noun (profile, manifest, policy, fixture, event, adapter, record, configuration, or generated file) gets an exact schema, lifecycle, owner, source of truth, invalid-data behavior, and a complete example. Define required and optional fields, types, allowed values, defaults, ordering, encoding, cardinality, and versioning. Show the intended boundary in tests; do not accept an internal substitute as an integration.

Add these tables or equivalent structured sections:

- **Ownership:** requirement/behavior, owner, authoritative input, verification location.
- **Required-case manifest:** stable ID, expected behavior, dependencies, evidence, and blocking severity. The denominator is design-owned, never derived from implemented files. When the manifest has more than about ten rows or a gate will read it, keep it as a machine-readable file (YAML or JSON) that the design links to and the gate loads, so a missing case fails in code rather than depending on a reader noticing. Give each case the work unit it belongs to (for example a `phase` or `unit` field, at the same level the work is split into PRs), so the cases for one unit can be selected and counted.
- **Protected paths:** the gate, manifest, required-case, golden/expected, and acceptance-test files that decide completion (see common rules). Write and approve them in the first work unit, before feature implementation.

Add these only when they apply; omit them otherwise:

- **External-assumption register** (outside vendors, services, or versions matter): dependency and pinned version, probe or authoritative citation, and result.
- **Mode matrix** (the feature has modes): every mode × relevant control, with defaults, invalid values, and precedence.
- **Evidence register** (captured or imported data): source, capture method, version, validation, and owner.

### 3. Specify failure, data, and synchronization policy

Define behavior for the failure states that apply (invalid input, missing or stale data, unavailable dependencies, timeout, unsupported capability), and give each corner case an edge-case label from the common rules. A non-running case requires a stable label, reason, proof, evidence owner, date/version, and explicit completion effect; it cannot silently become a pass.

For imported or captured data, classify fields as invariant, normalized, or variable. Define canonicalization, rotation, retry, expiry, tolerances, and the exact distinction between expected change and drift. State which artifacts are generated, how to regenerate them, how stale copies and conflicts are handled, and how divergence is detected.

A new capability, limitation, exception, owner, or status discovered during implementation updates the design in the same change. Include documentation, manifest, generated-artifact, and code synchronization in the merge gate.

### 4. Plan bounded work units

Break large work into modular, independently verifiable units. Each unit states deliverables, exclusions, prerequisites, dependencies, completion criteria, review boundary, and follow-up owner. Keep unrelated work from waiting behind an unresolved deep rewrite. State one-writer/worktree ownership and integration order when concurrent work is possible.

Define review policy: pre-review checks, required reviewers, blocking severities, maximum rounds (default 3), escalation path, approval authority, and the event that makes completion permanent. Use critical/high findings as blockers unless the design explicitly justifies otherwise; record medium/low follow-ups with an owner and target. Reaching the round limit with blockers left means the unit is blocked and escalates to the approval authority; it never counts as done.

Name a human approval point for each phase. Individual PRs may merge once implementation review marks them ready, including an agent-run acceptance check for user-visible changes. The phase itself is complete only after the owner runs the Owner Acceptance Script in the Acceptance Environment on the main branch and checks the phase's `owner:` items; the next phase does not start before then, and failures become fix work in the same phase. Agents may prepare and verify; they do not self-approve a phase.

### 5. Run independent adversarial review

Before approval, ask an independent reviewer or second agent to attack the design rather than merely summarize it. Give the reviewer the design and ask it to find incompatible implementer interpretations, false-green acceptance paths, missing manifest items, circular/self-validating gates, unverified external assumptions, silent skips, mode contradictions, unstable evidence rules, and code/design drift risks. Also ask it to flag over-specification: cases that could be `rejected` or `best-effort`, and sections or rules that do not apply. The reviewer must cite the exact section and classify each finding as Critical, High, Medium, or Low.

For Critical/High-risk designs, adversarial review is required and should be independent of the author. For lower-risk designs, it is recommended; a human may perform the same review using the questions below. Resolve findings or record an explicit non-blocking disposition before approval. This review complements implementation/code review: code review cannot prove that the original design was complete.

## Design document structure

Follow [`../design/common-rules.md`](../design/common-rules.md). Disclose branch-specific detail into a linked companion document when needed. Use consistent headings (H1 → H2 → H3), concrete examples, and feature names instead of ambiguous pronouns.

```markdown
# Feature: [Name]

## Executive Summary
[Problem, users, boundaries, observable outcomes, success measures]

## Scope, Terminology, and Invariants
[In scope, exclusions, definitions, invariants, guardrails]

## User Stories
1. As an <actor>, I want <feature>, so that <benefit>.

## Requirements and Ownership
| ID | Observable outcome | Owner | Source of truth | Verification | Severity |
|----|--------------------|-------|-----------------|--------------|----------|
| R-001 | ... | ... | ... | ... | High |

## Technical Design
### Architecture
[Highest testable seam and component boundaries]
### Data and API Contracts
[Exact schemas, errors, lifecycle, and complete examples]
### State and Mode Matrix
[Normal, invalid, unavailable, and mode-specific behavior]

## Required-Case Manifest
[Stable IDs for every route, scenario, integration, mode, artifact, permission, and matrix cell]

## External-Assumption Register (only when outside vendors, services, or versions matter)
[Versions, probes/citations, results]

## Evidence and Provenance (only for captured or imported data)
[Source, transformation, stable/variable fields, drift policy]

## Implementation Plan
### Phase 1: [Name]
- [ ] P1-01 Deliverable — done when: <observable result> — verify: cmd: `<command>` — covers: R-001; manifest: unit=P1
- [ ] P1-02 Decision recorded — done when: <criterion> — verify: review: <what the reviewer judges>
- [ ] P1-03 Works with real accounts — done when: <observable result> — verify: owner: <step the owner performs>

## Protected Paths
[Gate, manifest, required-case, golden/expected, and acceptance-test files; written and approved first; builders may not weaken them]

## Acceptance Environment
[How to start the system; exact URLs, hosts, and ports the owner uses; required env files]

## Owner Acceptance Script
1. <step in the Acceptance Environment> — expected: <result>

## Acceptance Matrix and Completion Gate
[Independent boundary tests, required commands, named results, exit semantics]

## Review Record
[Adversarial findings, dispositions, reviewers, rounds, approval authority]

## Out of Scope and Follow-ups
[Named owner and target for each deferred item]

## Decision Log
[Date, decision, alternatives, rationale, contract impact]

## Boundaries
- ✅ Always: [rules]
- ⚠️ Ask first: [rules]
- 🚫 Never: [rules]
```

## Completeness rules

Mark every applicable rule `pass`, `gap`, or `N/A`; do not infer an answer from likely implementation behavior.

1. Every requirement has an observable outcome.
2. Every input, output, file, event, error, and generated artifact has an exact shape and important examples.
3. Every behavior has one owner, source of truth, and verification location.
4. Required cases have a closed, stable, design-owned manifest, and each corner case has an edge-case label.
5. Acceptance crosses the specified boundary and cannot pass from self-comparison, substitutes, or any error status.
6. Applicable failure states are classified, and every skipped or non-running case has proof and an explicit blocking effect.
7. When they apply: external assumptions have a pinned version and a probe or citation; generated or imported data has regeneration, provenance, and drift rules; modes have defaults, invalid values, and precedence.
8. The final gate fails closed, checks every manifest item, and cannot be satisfied by editing protected paths.
9. Work units define scope, dependencies, deliverables, and completion; review defines blocking severity, round cap, escalation, and final approval.
10. The Acceptance Environment names the URLs the owner actually uses, and the Owner Acceptance Script covers every user-visible path in scope.
11. Every checklist item has a typed `verify:` (common rules), `cmd:` wherever the check can be automated, and no `[TODO:` markers remain.
12. Design and code/documentation change together.

## Completion gate

Approval is `REVISE` if any Critical, High, or coverage gap remains. Approval is `APPROVE` only when every applicable completeness rule passes, all deferred items have an owner and explicit non-blocking status, and the review record names the approving authority. Implementation starts only after the owner adds `Approved-by: <owner> <date>` to the document.

Implementation is complete only when:

- every manifest item exists exactly as declared and every boundary test runs;
- no item is omitted, silently skipped, renamed, aliased, or removed from the denominator;
- blocked/unsupported cases carry the prescribed evidence and do not inherit pass;
- generated artifacts and imported evidence, when present, regenerate cleanly and pass their checks;
- code, design, manifests, generated artifacts, and status are synchronized;
- required checks pass in a clean, reproducible environment;
- no protected path was weakened, and every ticked checklist item has reviewer-confirmed evidence;
- the Owner Acceptance Script passed in the Acceptance Environment: run by an agent with a real browser and recorded step by step for each user-visible PR, and run by the owner on the main branch before the phase counts as complete; and
- the completion record names the version/commit, commands, results, classifications, residual risks, follow-ups, and approval authority.

## Review questions

1. What exact user- or system-visible result is required, with what shapes and examples?
2. Who owns each behavior, and what is authoritative?
3. What fixed list prevents missing cases from changing the denominator?
4. Could the gate pass if the feature were absent, substituted, renamed, or partial?
5. Is every corner case labeled, and could more of them be `rejected` or `best-effort`?
6. Which assumptions depend on versions, vendors, or deployment, and how are they checked?
7. What is out of scope, and where is the follow-up boundary?
8. What command, report, and approval make completion permanent?

## Formatting rules

- Prefer a concrete JSON/YAML/code example over paragraphs or a field-description table.
- Keep each section self-contained and each implementation step paired with an exhaustive, checkable completion criterion.
- Keep one authoritative statement for each rule; link to disclosed detail instead of duplicating it.
