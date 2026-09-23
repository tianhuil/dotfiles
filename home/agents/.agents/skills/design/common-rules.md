# Common design rules

Apply these rules to both simple and large designs.

## Writing and discovery

Use plain language and avoid jargon unless necessary. Define each term before using it, then use that term consistently. Resolve repository facts before writing decisions: inspect existing seams, domain terminology, ADRs, configuration, and test commands.

Start with the user problem, users, observable outcomes, success measures, and explicit exclusions. Use exact examples for important contracts. Distinguish required behavior from follow-ups.

## Contracts and verification

- Pair every implementation step with a clear, checkable completion criterion.
- State the highest useful test seam and verify external behavior, not implementation details.
- Give every important behavior one owner and source of truth.
- Classify relevant failure states and external assumptions.
- Keep acceptance criteria reproducible and independently verifiable.

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
