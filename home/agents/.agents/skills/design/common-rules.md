# Common design rules

Apply these rules to both simple and large designs.

## Writing and discovery

Use plain language and avoid jargon unless necessary. Define each term before using it, then use that term consistently. Resolve repository facts before writing decisions: inspect existing seams, domain terminology, ADRs, configuration, and test commands.

Start with the user problem, users, observable outcomes, success measures, and explicit exclusions. Use exact examples for important contracts. Distinguish required behavior from follow-ups.

When rewriting or replacing an existing design, read it and any review comments on it first. Carry every prior decision forward, or record in the new document why it changed. Mark the old document superseded with a link to the new one.

## Style

- **YAGNI**: Do not design for future scale, additional cloud providers, or alternative database backends. Assume the current stack and load will remain fixed, unless told otherwise.  As an example:
  - **Anti-Pattern (Over-engineered):** *"We will implement an abstract* `NotificationStrategyFactory` *that dynamically instantiates SMS, Email, and Webhook providers based on a YAML policy configuration..."*
  - **Preferred Pattern (Minimal):** *"We will add a single function* `send_email_notification(user_id, message)` *in* `services/[notifications.py](http://notifications.py)` *using the SendGrid SDK."*
- **Simple:** Design this feature assuming it will be implemented by a single software engineer in less than 2 hours. Prioritize directness over theoretical abstraction. For example, do not implement these things unless asked:
  - No event buses / pub-sub unless processing asynchronous background queues.
  - No custom abstract base classes or multi-layered interfaces for single implementations.
  - No multi-tenant support, dynamic plugin systems, or speculative extensibility.

## Contracts and verification

- Pair every implementation step with a clear, checkable completion criterion.
- State the highest useful test seam and verify external behavior, not implementation details.
- Give every important behavior one owner and source of truth.
- Classify relevant failure states and external assumptions.
- Keep acceptance criteria reproducible and independently verifiable.

Checklist items are the unit of completion. A task names its work unit: either a heading (done when every checklist item under it is met) or a single checklist item (done when it and any items nested under it are met). Write each item in this form so a reviewer knows how to check it:

```markdown
- [ ] <ID> <deliverable> — done when: <observable result> — verify: <type>: <how> — covers: <R-IDs, manifest cases>
```

`verify:` names the kind of evidence. Use `cmd:` whenever the check can be automated; use the others only when it cannot:


| Type       | Example                                                     | The reviewer                                                                                           |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `cmd:`     | `cmd: `pnpm test:cell --framework authjs --profile google`` | runs it and records the decisive output line                                                           |
| `browser:` | `browser: Owner Acceptance Script step 3`                   | performs the step in the Acceptance Environment and records what it saw                                |
| `ci:`      | `ci: profile-tests (google)`                                | cites that job's result for the exact commit under review                                              |
| `review:`  | `review: decision recorded with alternatives and rationale` | judges the work against the stated criterion, quoting `file:line` and saying why it is or is not met   |
| `owner:`   | `owner: sign-in works against a real Microsoft tenant`      | cannot verify it; the item stays unticked and goes on the owner's checklist at the next approval point |


Do not dress up a judgment as a command: a `grep` that only proves a word exists is not evidence that research, a decision, or documentation is right. Use `review:` with a concrete criterion instead.

- `<ID>` is stable and unique in the document (for example `P1-03`). Never renumber or reuse an ID; add new ones at the end.
- `covers:` is optional. It links the item to the requirement-table rows (`R-…`) and required-case manifest entries it satisfies. Those tables are traceability and evidence for checklist items, not a second list of things to complete.
- Items without an ID (older documents) are identified by position under their heading, for example `§1.1.3#2`.

Only a reviewer-confirmed MET item may be ticked; `owner:` items are ticked only by the owner. Implementers never choose which items are ticked; the ticking is a separate, mechanically checked commit made after review.

## Acceptance environment and owner check

Every design that changes user-visible or integration behavior includes two short sections:

- **Acceptance Environment:** how to start the system and the exact URLs, hosts, and ports the owner actually uses (for example a remote or Tailscale origin, not only `localhost` on the agent's machine). Take these from the repository's `AGENTS.md` when it defines them. Acceptance runs there.
- **Owner Acceptance Script:** 1–8 numbered steps a person can run in under ten minutes, or an agent can run with a real browser, each with its expected result. Agents run it before a user-visible change is ready to merge; the owner runs it at the design's approval points. CI passing does not replace it.

## Protected paths

List the files that decide whether the work is done: gates, manifests, required-case lists, golden or expected files, and acceptance tests. Builders must not weaken them (remove cases, add skips, lower thresholds, or edit expected values to match new output) unless the design names that exact change as a deliverable. When the work is large, write and approve these files before implementation starts.

## Ready to build

A design is ready for implementation only when no `[TODO:` markers remain and, for large designs, the owner has added a line `Approved-by: <owner> <date>` (a reviewer's `APPROVE` verdict is input to that decision, not a substitute for it). Implementation skills check this before starting.

## Boundaries

Use three tiers:

- **Always:** follow required workflow, use existing seams, and keep design, code, and documentation synchronized.
- **Ask first:** add dependencies, change persistent data or public APIs, or expand scope.
- **Never:** commit secrets, claim an untested case passes, or silently replace a required integration with a substitute.

## Output

Write the document to `notes/design/[feature-name]-design.md` using kebab-case. Keep simple documents under 200 lines and large documents under 300 lines. Keep each document concise and self-contained.

## Recommended decisions

When a design has an unresolved question or decision, write the recommended solution in the desing doc body first. Then add an inline TODO at the decision point using this exact form:

`[TODO: Chose to <recommended choice>; or edit to say "<alternative 1>" or "<alternative 2>".]`

Example:

`Use React for the frontend. [TODO: Chose to use React; or edit to say "Use Svelt for the frontend" or "Use Angular for the frontend".]`

Note that the TODO is written so it can be deleted to accept the recommendation (React in this case).  Exact replacement language is given to make other options easy to switch to.

Use TODOs only for genuine unresolved decisions. Resolve repository facts before writing them.