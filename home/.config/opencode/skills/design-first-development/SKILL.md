---
name: design-first-development
description: Design-first development workflow with milestone planning, design docs, and research notes. Use when starting new features or projects to plan architecture before coding.
metadata:
  audience: developers
  workflow: project-planning
---

# Design-First Development

## Core Principle

Write design docs before code. A well-structured `notes/` directory with context, design, and research docs reduces rework and provides a single source of truth.

## Directory Structure

```
notes/
├── context/
│   ├── core.md          # Project purpose, goals, and scope
│   └── milestones.md    # M1/M2/M3 milestone definitions with boundaries
├── design/
│   └── m1-feature.md    # Detailed design doc for each milestone
└── research/
    └── topic.md         # Research on external APIs, schemas, libraries
```

## Milestone Planning

Define milestones with explicit boundaries. Each milestone should:

- Have a clear goal and deliverables
- List tables/entities affected
- Specify what is NOT included (boundaries prevent scope creep)
- Reference a design doc with full specification

```markdown
## M1: Single-Tenant CLI CRUD

### In Scope
- Direct DB CRUD via CLI
- Tables: users, projects, tasks

### Out of Scope (M2)
- Authentication
- Multi-tenancy
- API server

### Design Doc
See [m1-cli-crud-design.md](../design/m1-cli-crud-design.md)
```

## Design Doc Structure

Each design doc should cover:

1. **Architecture** - Layer diagram and data flow
2. **Data Model** - Full SQL DDL or Drizzle schema
3. **API/CLI Spec** - Exhaustive specification of every endpoint/command with flags, types, defaults, examples, and output formats
4. **Implementation Plan** - Ordered phases with dependencies
5. **Testing Strategy** - Test framework, isolation approach, what to test
6. **Input Validation** - Validation approach (e.g., Zod schemas)
7. **Boundaries** - Explicit "always" and "never" rules

## Research Docs

When integrating external services, write a research doc first:

- Study the external API/schema
- Map fields to your internal schema
- Note gotchas and edge cases
- Include working configuration examples

## Implementation Phases

Break each milestone into ordered phases. Each phase should:

- Build on the previous phase
- Be independently testable
- Follow a logical dependency order

Example:
1. **Foundation** - Dependencies, schema, DB client, utilities
2. **Core entities** - CRUD for primary tables
3. **Relationships** - Join tables, associations
4. **Tests** - E2E tests for all operations

## Rules

- Never commit `.env` files
- Always generate migrations (never hand-write SQL)
- Always validate input with Zod
- Test against real in-memory databases (e.g., PGLite), not mocks
