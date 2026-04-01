---
description: Design a feature; writes markdown design files for human review and agent execution. Place in `notes/design` folder.
---

# Design Document Best Practices for AI Agents

## Overview

Design documents for AI agents differ from traditional specs—they must be both human-readable and machine-parseable. The spec is your "source of truth" that guides the agent throughout the project lifecycle.

## Core Principles

### 1. Start High-Level, Iterate Down

- Begin with a concise "product brief" (1 paragraph): what problem, who users, success criteria
- Let the AI expand this into a detailed spec
- Use Plan Mode (read-only) to draft and refine before any code is written
- The spec becomes a living artifact that persists between sessions

### 2. Structure Like a Professional PRD/SRS

Six core areas from GitHub's analysis of 2,500+ agent configs:

| Area | What to Include |
|------|-----------------|
| **Commands** | Executable commands with flags: `npm test`, `pytest -v` |
| **Testing** | Framework, test file locations, coverage expectations |
| **Project Structure** | Explicit paths: `src/`, `tests/`, `docs/` |
| **Code Style** | One real code snippet > three paragraphs of description |
| **Git Workflow** | Branch naming, commit format, PR requirements |
| **Boundaries** | What the agent should never touch |

### 3. Use Three-Tier Boundaries

```
✅ Always:    Run tests before commits, follow naming conventions
⚠️ Ask first: Database schema changes, adding dependencies  
🚫 Never:     Commit secrets, edit node_modules/, modify CI config
```

### 4. Write for Chunking (LLM-Friendly)

- Each section should be self-contained and retrievable
- Use consistent terminology—don't mix "API key", "access token", "auth credential"
- Include feature/product names in every relevant section
- Format code blocks explicitly—inline code gets mangled
- Keep heading hierarchy consistent (H1→H2→H3, never skip levels)
- Avoid pronouns: say "Update config.yaml" not "Update it and restart"

### 5. Break Large Tasks into Modular Prompts

- Don't dump everything in one prompt—context window limits and "curse of instructions" degrade quality
- Split by component: "Backend API Spec" and "Frontend UI Spec" separately
- Use extended TOC/summaries for large specs
- Each prompt should focus on one task/section

### 6. Include Verification & Quality Gates

- **Self-verification**: Ask agent to confirm all requirements are met
- **LLM-as-a-Judge**: Use a second agent to review first agent's output
- **Conformance tests**: YAML-based tests that any implementation must pass
- Define success metrics explicitly—what does "good" look like?

### 7. Handle LLM-Specific Concerns

For LLM/AI features specifically:

| Section | Key Question |
|---------|--------------|
| **Problem Statement** | What language-heavy workflow are we automating? |
| **Data Strategy** | Where is "source of truth" (RAG, API, fine-tuning)? |
| **Model Config** | Model name, temperature, top-p, system instructions |
| **Evaluation** | Golden dataset, metrics (faithfulness, instruction compliance) |
| **Failure Modes** | Fallback strategies, uncertainty signaling |
| **Security** | Prompt injection prevention, PII handling |

## Design Doc Template

```markdown
# Feature: [Name]

## Executive Summary
[1-2 paragraphs: what, why, success criteria]

## User Stories
- [User] can [action] so that [benefit]

## Technical Design

### Architecture
[System diagram or description]

### Data Model
[Schema, types, relationships]

### API Contracts
[Endpoints, request/response shapes]

## Implementation Plan

### Phase 1: [Name]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name]
- [ ] Task 3

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Boundaries
- ✅ Always: [rules]
- ⚠️ Ask first: [rules]
- 🚫 Never: [rules]

## Open Questions
- [Question 1]
- [Question 2]
```

## Output Location

Place design documents in: `notes/design/`

Filename format: `[feature-name]-design.md` (kebab-case)

## References

- [Addy Osmani: How to write a good spec for AI agents](https://addyo.substack.com/p/how-to-write-a-good-spec-for-ai-agents)
- [GitHub: Writing great agents.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Simon Willison: Vibe Engineering](https://simonwillison.net/2025/Oct/7/vibe-engineering/)
