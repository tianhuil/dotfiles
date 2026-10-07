---
name: prototype-design
description: Design a feature by building a small, disposable prototype alongside the design to resolve major technical uncertainty. Use when external APIs, dependencies, or integration behavior are unproven and a runnable experiment can reduce risk before implementation.
metadata:
  audience: developers
  workflow: prototype-design
---

# Prototype Design

Use this workflow when a design depends on a major technical assumption that can be tested with a small runnable prototype: external API behavior, dependency compatibility, integration seams, authentication, data shape, or performance constraints. The prototype answers specific technical questions; it does not replace the design or production implementation.

## Workflow

1. **Define uncertainty.** Inspect the repository and list the highest-risk assumptions. Turn each into a falsifiable question, with observable pass/fail evidence. If no meaningful technical uncertainty is testable by a prototype, use [`../design/SKILL.md`](../design/SKILL.md) instead.
2. **Set boundaries.** Record the prototype's scope, inputs, expected outputs, environment, and explicit exclusions. Use sandbox accounts, disposable data, and non-production credentials. Do not expose secrets in source, logs, or artifacts.
3. **Design.** Choose simple or large format using [`../design/SKILL.md`](../design/SKILL.md), then follow its shared rules. Write the design to `notes/design/[feature-name]-design.md`. Include the uncertainty questions, prototype location and run command, evidence to capture, and how each result affects the design.
4. **Build the smallest experiment.** Create a clearly named, disposable prototype using the real dependency or external API where practical. Keep it isolated from production paths and data. Avoid broad architecture, polish, and unrelated features. Make setup and execution reproducible; document required environment variables by name, never their values.
5. **Run and record.** Execute the experiment and record exact commands, environment/version details, observed outputs, failures, and limits in the design. Mark each assumption confirmed, rejected, or unresolved. A mock can check local wiring, but cannot confirm external behavior.
6. **Update the contract.** Revise design decisions and acceptance criteria from the evidence. Keep unresolved uncertainty explicit with an owner and next verification step. Prototype success is not production acceptance.
7. **Handoff.** Keep prototype disposable and visibly labeled. State what may be reused, what must be rewritten, and its cleanup/retention plan. Do not merge prototype code into production paths unless separately reviewed and accepted.

## Completion

Done when the design identifies its testable uncertainty, a reproducible experiment has been run or its blocker recorded, evidence is captured, and resulting decisions and remaining risks are reflected in the design. Never claim a question is resolved without observed evidence.
