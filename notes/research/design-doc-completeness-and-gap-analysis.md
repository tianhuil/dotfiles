# Design-document completeness and gap analysis

Date: 2026-09-13  
Purpose: derive a reusable method for deciding whether a design document or specification is implementable, testable, and complete enough to approve.

## Executive conclusion

A design is not complete because it is coherent, detailed, or accompanied by passing tests. It is complete only when an independent implementer can determine what must exist, an independent reviewer can determine whether it exists, and a deterministic gate fails when any required part is absent or misrepresented.

The most dangerous omissions are not missing prose about unusual edge cases. They are missing contracts at the seams:

- the exact shape of generated and exchanged artifacts;
- the owner and source of truth for each behavior;
- the immutable set of required cases;
- rules for unsupported, blocked, unavailable, and inconclusive cases;
- assumptions about external systems and their versions;
- mode-by-mode behavior;
- stability and provenance of evidence; and
- a completion gate that is independent of the implementation under review.

When those decisions are absent, teams can produce two materially different implementations from the same document, or produce a green result that does not satisfy the intended requirement. The local evidence shows both forms: one implementation spent dozens of review rounds inventing quirk schemas and ownership rules, while another completed its planned phases efficiently but inherited an incorrect external-data model and converted some would-be failures into “unsupported” skips. See [oauth-mock-impl-a-vs-b-design-gaps.md](./oauth-mock-impl-a-vs-b-design-gaps.md), “The gaps, worst first” and “How to write the next spec.”

## 1. What “complete” means

Use five tests for every requirement:

1. **Observable:** what can a user, caller, operator, dependent service, or reviewer observe?
2. **Reproducible:** under what inputs, environment, versions, and setup can it be observed again?
3. **Owned:** which component, document, generator, or operator is responsible?
4. **Enumerated:** what is the complete set of cases and artifacts, and how is omission detected?
5. **Gated:** what command or review decision fails when the requirement is absent?

A requirement such as “support validation” fails the first test. “Reject an expired credential with error code X, without issuing a session, in strict mode” is observable and assertable. A requirement such as “add profiles” fails the fourth test unless the profiles are named and the gate checks the full list.

Completeness is therefore a property of the design’s decision record, not its word count. A short design with exact schemas, ownership, enumerations, evidence, and gates is stronger than a long design full of adjectives such as “realistic,” “robust,” or “production-like.”

## 2. Evidence from the comparative implementation review

The four source reports describe two implementation runs against substantially the same design material. Their findings generalize as follows.

### 2.1 Semantic rules without representation cause implementation divergence

A rule can explain what a concept means while failing to define how it is represented. The first run’s quirk work had semantics (`setting`, `value`, `when`) but no approved file format, owner, mode binding, provenance fields, invalid-data behavior, or stale-file policy. A worker explicitly asked which representation was authoritative; the answer was added during implementation. The work then required roughly 46 runs and 22 review rounds, with successive fixes exposing further ambiguity. See [oauth-mock-impl-a-vs-b-design-gaps.md](./oauth-mock-impl-a-vs-b-design-gaps.md), “Quirks had rules but no format, no owner, no mode rules,” and “Strict vs lenient mode.”

**General lesson:** for every named noun in a design—profile, manifest, policy, event, fixture, adapter, record, configuration, or generated file—define its schema, lifecycle, owner, and example. Otherwise each implementer supplies a private interpretation.

### 2.2 Green tests can certify hollow work

The original completion language allowed direct endpoint calls, echo servers, or harness endpoints to count as end-to-end matrix tests. The resulting implementation passed local checks while lacking required behavior and coverage. A later roadmap amendment had to state that an echo server is not a matrix test, that every named cell is required, and that an error status cannot count as success. See [oauth-mock-impl-a-vs-b-design-gaps.md](./oauth-mock-impl-a-vs-b-design-gaps.md), “Done could be met with fake work,” and [oauth-mock-impl-a-vs-b-trust-and-divergence.md](./oauth-mock-impl-a-vs-b-trust-and-divergence.md), §1.2.

**General lesson:** acceptance must test the intended boundary, not merely an internal function or a process that happens to return. A test written from the implementation can preserve a wrong design and still pass.

### 2.3 External assumptions are requirements, not background knowledge

The design assumed that named third-party applications could redirect a provider flow to the test service. At pinned versions, two applications ignored the relevant override and hardcoded the real provider. The implementation had to classify those cases as blocked rather than inventing misleading workarounds. Another library sent a token using a query parameter while the design modeled only an authorization header; the capability was added in code but not in the design. See [oauth-mock-impl-a-vs-b-design-gaps.md](./oauth-mock-impl-a-vs-b-design-gaps.md), “Pointing named server software at the mock was assumed possible” and “How the access token is sent.”

**General lesson:** “configurable,” “compatible,” and “supports protocol X” are hypotheses. Record the exact version, configuration path, network boundary, and verification procedure. If verification fails, define the classification and completion effect before implementation begins.

### 2.4 Evidence data needs stability and provenance rules

Captured external data varied legitimately: key counts changed, and certificate domains did not fit an over-narrow host-list rule. Without stability rules, drift checks either accept real mistakes or reject legitimate rotation. Without provenance, a fixture cannot show why it is trusted. See [oauth-mock-impl-a-vs-b-design-gaps.md](./oauth-mock-impl-a-vs-b-design-gaps.md), “Real providers change their data,” and [oauth-mock-impl-a-vs-b-trust-and-divergence.md](./oauth-mock-impl-a-vs-b-trust-and-divergence.md), §§1.3–1.5.

**General lesson:** each fixture or golden needs origin, acquisition method, timestamp/version, transformations, stable fields, variable fields, allowed variation, rotation behavior, and drift policy.

### 2.5 Delivery mechanics affect whether completion remains visible

The phase-based run delivered all planned units with bounded review rounds, isolated worktrees, pull requests, and roadmap updates. The ticket-based repair run spent most of its budget on one deeply ambiguous area; its review cap was repeatedly overridden, its roadmap status was not updated, and unfinished work remained hard to distinguish from completed work. See [oauth-mock-impl-a-vs-b-roadmap-comparison.md](./oauth-mock-impl-a-vs-b-roadmap-comparison.md), §§3, 6–10, and [oauth-mock-impl-a-vs-b-skills-comparison.md](./oauth-mock-impl-a-vs-b-skills-comparison.md), §§3–6.

**General lesson:** the specification should define unit boundaries, prerequisites, outputs, review severity, iteration limits, merge/approval conditions, and status transitions. Process cannot repair an underspecified contract, but good process prevents one uncertain unit from hiding all other progress.

## 3. Direct recommendations for the next design

These recommendations preserve the most actionable conclusions from the comparative analysis.

1. **Give every generated file an exact format.** Any design that prescribes a format must include the schema and one complete worked example from source input to generated output. This is especially important for configuration, fixtures, manifests, policies, and captured evidence.
2. **Add one ownership table.** For every behavior, record the owning component, authoritative source, and verification location. This prevents repeated disputes over whether a rule belongs in data, an engine, a registry, a connector, a harness, or a gate.
3. **Make “done” a fixed list.** Enumerate required cases and scenarios by name. Missing work must fail visibly; it must not disappear through aliases, renamed cases, or a denominator derived from whatever was implemented.
4. **Predefine incomplete-case labels.** Agree in advance on meanings and proof requirements for `blocked`, `unsupported`, `advisory`, `degraded`, and `inconclusive`. A design should say whether each label blocks completion.
5. **Update the design with the implementation.** Newly discovered capabilities, limitations, exceptions, and ownership decisions belong in the same change as the code. “Documentation updated” should be a merge-check item.
6. **State which evidence is stable.** For each saved or captured artifact, identify immutable fields, legitimately variable fields, rotation behavior, normalization, and the definition of real drift.
7. **Use one mode table.** If strict, lenient, compatibility, or other modes exist, write one complete control-by-mode table, including invalid values and precedence. Do not let mode rules emerge across review rounds.
8. **State process rules for the implementation.** Define work-unit ownership, one-writer/worktree rules, dependency order, review caps, escalation, and the required gate in a clean checkout. Process ambiguity can obscure which code was actually verified.

## 4. Objective completeness rules

Apply these rules literally. Mark each `pass`, `gap`, or `not applicable`; do not infer an answer from likely implementation behavior.

### Rule 1: Observable outcomes
Every requirement states an externally observable result, including success, rejection, side effects, timing where relevant, and error shape.

### Rule 2: Exact shapes
Define required and optional fields, types, allowed values, defaults, ordering, encoding, cardinality, versioning, and complete examples for important inputs, outputs, files, records, events, and generated artifacts.

### Rule 3: Single ownership
For each behavior, name exactly one owner, its inputs, its source of truth, and where it is verified. A registry, data file, engine, connector, harness, and gate must not all appear able to decide the same rule.

### Rule 4: Source of truth and generation
Identify authoritative sources, generated copies, regeneration commands, conflict resolution, stale-artifact behavior, and the check that detects divergence.

### Rule 5: Closed required set
Enumerate stable identifiers for every route, scenario, integration, mode, artifact, permission, and matrix cell. The denominator is declared in the design, not derived from files found in the implementation.

### Rule 6: Independent acceptance
Tests must exercise the specified boundary and must not merely call the implementation under test, compare an artifact with itself, accept any error as success, or count a substitute as the required integration without an explicit equivalence argument.

### Rule 7: Failure classification
Define behavior for invalid input, missing data, stale data, conflicting sources, unavailable dependencies, timeout, unsupported capability, blocked setup, degraded execution, and inconclusive evidence. Define whether each blocks approval.

### Rule 8: Proof for non-running cases
For every skipped or non-running case, require a stable classification, reason, evidence, evidence owner, date/version, and explicit completion effect. “Not tested” must not silently become “unsupported.”

### Rule 9: External assumptions
List dependency versions, protocol assumptions, configuration knobs, deployment/network conditions, security prerequisites, and platform limits. Each must have a probe, test, or authoritative citation.

### Rule 10: Mode matrix
For each mode and each relevant control, specify behavior, defaults, invalid values, precedence, and failure semantics. A mode mentioned once is not a mode specification.

### Rule 11: Data change policy
Separate invariant, normalized, and variable fields. Define rotation, retry, tolerances, canonicalization, expiry, and the exact distinction between expected change and drift.

### Rule 12: Provenance
Record source, capture method, time, version, transformation, validation, and relationship to runtime behavior for imported or externally sourced data.

### Rule 13: Exhaustive gate
The final gate checks all required cases and artifacts, exercises behavior, validates synchronization, forbids silent skips, and runs in a reproducible environment. It must fail closed on incompleteness.

### Rule 14: Design/code synchronization
A new capability, limitation, exception, owner, or status must update the design in the same change. Code-only decisions are design drift.

### Rule 15: Scope and dependencies
Each work unit states deliverables, exclusions, prerequisites, dependencies, completion criteria, and follow-up boundaries. Unrelated work should not wait behind an unresolved deep rewrite.

### Rule 16: Review boundary
Define pre-review checks, required reviewers, blocking severities, maximum rounds, escalation, approval authority, and the event that makes completion permanent.

## 5. Failure modes and detection

| Failure mode | Why it happens | Detection rule |
|---|---|---|
| Two implementations diverge | Semantics exist without schemas or ownership | Require exact shapes, examples, and an ownership table |
| Fake end-to-end coverage | Test reaches an internal substitute rather than the required boundary | Trace each test’s caller, process, dependency, and assertion to the requirement |
| Missing cases disappear | Denominator is generated from implemented files | Compare implementation identifiers to a design-owned manifest |
| Wrong data becomes a clean skip | Skip logic trusts the same data it is meant to validate | Validate source data independently; require evidence for every skip |
| External integration is impossible | Configuration support was assumed, not probed | Run a version-pinned configuration probe before marking supported |
| Legitimate drift fails the build | All fields are treated as immutable | Classify fields and define rotation/tolerance policy |
| Code silently outruns the design | Decisions are made during implementation only | Require design update in the same change and a synchronization check |
| Review consumes the project | No severity floor or round limit | Block only critical/high findings; cap rounds and escalate unresolved issues |
| Status becomes misleading | Completion is a prose opinion or stale checkbox | Require atomic artifact, gate, approval, and status update |
| Concurrent changes obscure truth | Multiple writers share a branch/worktree | One writer per worktree; integrate through explicit units |

## 6. Review questions

Ask these questions in order, collecting evidence rather than opinions:

1. What exact user-visible or system-visible result is required?
2. What are the exact input, output, file, event, and error shapes? Is there a complete example?
3. Who owns each behavior, and where is that ownership enforced?
4. What is authoritative, what is generated, and how is drift detected?
5. What is the immutable list of required cases? Can a missing item alter the denominator?
6. Does every acceptance test cross the intended boundary?
7. Can the tests pass if the feature is absent, substituted, renamed, or only partially implemented?
8. What happens for invalid, missing, stale, conflicting, unavailable, unsupported, blocked, degraded, and inconclusive states?
9. What evidence is required to call a case unsupported or blocked?
10. Which assumptions depend on a version, vendor, protocol, network, or deployment detail?
11. What changes by mode, including invalid mode values and precedence?
12. Which captured fields are stable, variable, normalized, or rotatable?
13. Can an independent person reproduce the evidence in a clean environment?
14. What discoveries would require a design update, and is that update part of the same change?
15. What is explicitly out of scope, and what is the named follow-up boundary?
16. What exact command, report, and approval make completion irreversible?

A useful review artifact is a coverage table with columns: requirement ID, observable outcome, exact shape, owner, source, required cases, acceptance test, failure classification, evidence, status, and blocking severity. Blank cells are gaps, not invitations to infer.

## 7. Completion gate

A design may be approved only if every applicable rule passes. Implementation may be declared complete only when all of the following are true:

1. The design-owned manifest contains every required case and artifact.
2. The implementation contains each manifest item exactly once or according to an explicitly defined multiplicity.
3. Every required boundary test runs and reports a named result.
4. No required item is omitted, silently skipped, renamed, or represented by an alias.
5. Unsupported and blocked cases include the prescribed evidence and do not inherit a passing status.
6. Generated artifacts regenerate cleanly from their source of truth.
7. Imported evidence passes independent schema, provenance, and stability checks.
8. Documentation, manifests, generated artifacts, and code are synchronized.
9. Required static checks, unit checks, integration checks, and environment checks pass in a clean, reproducible environment.
10. The report distinguishes `pass`, `fail`, `blocked`, `unsupported`, `degraded`, and `inconclusive`; exit status reflects the design’s declared policy.
11. Required reviewers approve within the stated round limit.
12. The completion record names the commit/artifact version, commands, results, unresolved follow-ups, and approval authority.

The gate must not be self-validating in a circular way. For example, a gate that reads the implementation’s own list of supported cases and then checks only those cases cannot prove completeness. The required list must come from the design or an independently reviewed manifest. Likewise, a test that accepts any non-success status as an expected failure proves neither the intended error nor the integration path.

## 8. Blocking gaps versus follow-up improvements

A gap is **blocking** when leaving it open makes implementation materially ambiguous, makes acceptance unverifiable, permits a false green result, hides a required case, or can invalidate a safety/security/data-integrity claim. Typical blockers are missing schemas, missing owners, mutable denominators, undefined failure classifications, unverified external assumptions, undefined strictness, and absent gate behavior.

A gap is a **follow-up improvement** when the core contract is deterministic and independently verifiable without it. Examples include clearer explanatory prose, optimization, additional diagnostics, broader platform support outside the declared scope, or a second reviewer for a low-risk area.

Use this decision test:

- Could two competent implementers make incompatible choices? **Block.**
- Could the gate pass while required work is missing or wrong? **Block.**
- Could a user or dependent system observe materially different behavior? **Block.**
- Is the issue only convenience, performance, readability, or extra coverage after the declared contract is met? **Follow up.**
- Is it outside scope but likely valuable? **Follow up with owner and boundary**, not an implicit promise.

Severity should reflect consequences, not the number of words needed to fix the document:

- **Critical:** false completion, unsafe behavior, data-integrity failure, or an unbounded ambiguity at a core boundary.
- **High:** materially different valid implementations, missing required coverage, or an unverified dependency assumption.
- **Medium:** a bounded behavior or evidence rule is unclear but does not defeat the whole gate.
- **Low:** explanatory or maintainability improvement with no acceptance impact.

The approval result is `REVISE` if any critical, high, or coverage gap remains. It is `APPROVE` only when all applicable rules pass and deferred items have an owner, target, and explicit non-blocking status.

## 9. Recommended document structure

A reusable design template should contain:

1. **Scope and outcomes** — users, boundaries, exclusions, success measures.
2. **Terminology and invariants** — definitions that cannot vary by implementer.
3. **Component ownership table** — behavior, owner, source, verification.
4. **Schemas and worked examples** — inputs, outputs, files, errors, generated forms.
5. **State and mode tables** — normal, invalid, unavailable, and mode-specific behavior.
6. **Required-case manifest** — stable IDs, dependencies, expected evidence.
7. **External-assumption register** — versions, probes, citations, fallback classifications.
8. **Evidence and provenance policy** — acquisition, stability, drift, retention.
9. **Acceptance matrix and gate** — independent tests, commands, exit semantics.
10. **Work-unit plan** — deliverables, prerequisites, review boundaries, follow-ups.
11. **Decision log** — dated decisions and their effect on the contract.
12. **Completion report format** — exact fields for commands, results, findings, residual risks, and approval.

## 10. Method and sources

This report generalizes a comparative, read-only review of two implementation runs. The source reports are:

- [notes/research/oauth-mock-impl-a-vs-b-design-gaps.md](./oauth-mock-impl-a-vs-b-design-gaps.md), especially “The gaps, worst first,” “Who struggled with what,” and “How to write the next spec.”
- [notes/research/oauth-mock-impl-a-vs-b-roadmap-comparison.md](./oauth-mock-impl-a-vs-b-roadmap-comparison.md), especially §§3, 6, 7, 9, and 10.
- [notes/research/oauth-mock-impl-a-vs-b-skills-comparison.md](./oauth-mock-impl-a-vs-b-skills-comparison.md), especially §§3–6 and §10.
- [notes/research/oauth-mock-impl-a-vs-b-trust-and-divergence.md](./oauth-mock-impl-a-vs-b-trust-and-divergence.md), especially §§1.2–1.5 and Part 2.

The product-specific names and examples above are used only to identify the observed evidence; the rules and recommendations are intended for any project.

## 11. Concrete findings from the source review

These are the observed findings that support the generalized rules above. Paths are relative to this repository; severities describe the design or process risk at the time of the comparison.

| Severity | Source path and section | Finding | General consequence |
|---|---|---|---|
| Critical | `notes/research/oauth-mock-impl-a-vs-b-design-gaps.md`, “Quirks had rules but no format, no owner, no mode rules” | A central data-driven behavior had semantics but no representation, ownership, mode contract, provenance, or invalid-data policy. | Different implementers can build incompatible systems and review cannot establish correctness. |
| Critical | `notes/research/oauth-mock-impl-a-vs-b-design-gaps.md`, “Done could be met with fake work” | Completion language permitted substitutes and shallow tests to count as end-to-end coverage. | A green gate can certify missing behavior and corrupt the project’s status. |
| High | `notes/research/oauth-mock-impl-a-vs-b-design-gaps.md`, “Pointing named server software at the mock was assumed possible” | A third-party configuration assumption was not verified at pinned versions, and no blocked classification existed. | Teams waste effort on impossible paths or hide an integration limitation behind a workaround. |
| High | `notes/research/oauth-mock-impl-a-vs-b-design-gaps.md`, “The route table in the docs contradicted what the strict-client tests needed” | The documented required surface conflicted with evidence and consumers. | The same specification can produce materially different coverage and behavior. |
| Medium | `notes/research/oauth-mock-impl-a-vs-b-design-gaps.md`, “Real providers change their data” | Drift checks lacked a policy for legitimate key rotation and variable evidence fields. | Valid updates fail, or real regressions are normalized as expected change. |
| High | `notes/research/oauth-mock-impl-a-vs-b-trust-and-divergence.md`, §1.3 | Skip classification trusted provider data that was itself wrong, turning expected failures into clean unsupported counts. | A self-referential gate can conceal missing or incorrect cases. |
| High | `notes/research/oauth-mock-impl-a-vs-b-roadmap-comparison.md`, §9 | A deep work unit could block most of the backlog, while review rounds had no enforced stopping rule. | Repair churn consumes the delivery budget without producing an auditable completion state. |
| Medium | `notes/research/oauth-mock-impl-a-vs-b-skills-comparison.md`, §5 (“Followed vs. deviated”) | The prescribed validation helper was not run, despite direct checks being performed. | A documented process can appear compliant while its intended single gate is untested. |

## 12. Review result

**REVISE** is the correct result for any design that fails one of the blocking rules above. Do not approve on the basis of passing implementation tests alone. Approval requires an explicit contract, independent evidence, and a deterministic completion gate.

## Acceptance report

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Created notes/research/design-doc-completeness-and-gap-analysis.md with concrete generalized findings, source citations by relative path and section, severity guidance, review questions, and a deterministic completion gate."
    }
  ],
  "changedFiles": [
    "notes/research/design-doc-completeness-and-gap-analysis.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "wc -l -c notes/research/design-doc-completeness-and-gap-analysis.md",
      "result": "passed",
      "summary": "Report exists and is 280 lines / 24891 bytes."
    }
  ],
  "validationOutput": [
    "Read all four requested source reports and .agents/skills/design-completion-review/SKILL.md before writing.",
    "Confirmed the report ends with the required structured acceptance report."
  ],
  "residualRisks": [
    "Research conclusions depend on the evidence and implementation-run limitations documented in the four source reports."
  ],
  "noStagedFiles": true,
  "diffSummary": "Added one detailed, generalized design-document completeness and gap-analysis report; no other files modified.",
  "reviewFindings": [
    "No blocking findings in the newly written report."
  ],
  "manualNotes": "Recommendations avoid product-specific names except in the methodology/source section and cited evidence context."
}
```
