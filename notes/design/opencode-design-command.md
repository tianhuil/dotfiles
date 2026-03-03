# Feature: OpenCode Design Command

## Executive Summary

Create a new OpenCode command (`/design`) that generates structured design documents for feature development. The command should produce markdown files that serve as both human-readable specifications and agent-executable task lists. Output goes to `notes/design/` folder.

## User Stories

- **User** can run `/design [feature-name]` to scaffold a design document
- **User** gets a template with all required sections pre-filled
- **User** can iterate on the design with the agent before coding begins

## Technical Design

### Architecture

```
User runs /design command
         ↓
OpenCode parses intent, collects context
         ↓
Agent generates SPEC.md in notes/design/
         ↓
User reviews and approves
         ↓
Agent can execute against spec for implementation
```

### Data Model

```typescript
interface DesignDocument {
  title: string;
  executiveSummary: string;
  userStories: UserStory[];
  technicalDesign: {
    architecture: string;
    dataModel: string;
    apiContracts: string;
  };
  implementationPlan: Phase[];
  acceptanceCriteria: string[];
  boundaries: {
    always: string[];
    askFirst: string[];
    never: string[];
  };
  openQuestions: string[];
}
```

### Commands

- `notes/design/` - Output directory for design documents
- Filename format: `[feature-name]-design.md`

## Implementation Plan

### Phase 1: Command Definition
- [ ] Add `/design` command to OpenCode commands
- [ ] Implement prompt template for design generation
- [ ] Set output path to `notes/design/`

### Phase 2: Template Generation
- [ ] Create design document template
- [ ] Add interactive prompts for each section
- [ ] Support appending to existing notes

### Phase 3: Integration
- [ ] Link with `/research` command for gathering context
- [ ] Add spec validation (ensure all sections filled)
- [ ] Create index file in `notes/design/`

## Acceptance Criteria

- [ ] Running `/design my-feature` creates `notes/design/my-feature-design.md`
- [ ] Document includes all sections from template
- [ ] Agent can execute tasks from the generated spec
- [ ] Design docs are human-readable and actionable

## Boundaries

- ✅ Always: Use kebab-case filenames, include all template sections
- ⚠️ Ask first: Changing template structure, adding new sections
- 🚫 Never: Overwrite existing design docs without confirmation

## Open Questions

- Should the command support generating partial specs (just architecture section)?
- How to handle multi-file features that span multiple design docs?
