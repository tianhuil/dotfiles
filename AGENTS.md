# Dotfiles Architecture

## Directory

The `./home` folder the ground truth for `~/.`.

It is setup by `./setup.sh`, which will:

1. Copy all files from `home/` to `~/`
2. Recursively copy directories to their corresponding locations
3. Set appropriate permissions on executable files
4. Configure git to use the global ignore file

**Note**: This will overwrite existing files in your home directory.

## Viewing Changes

To see differences between repository files in `home/` and installed files:

```bash
./diff.sh
```

## OpenCode Agents and Skills

### Agents
Located in `home/.opencode/agents/`, these are reusable agent definitions.

**writing-skills.md**: Expert agent for creating opencode skills following best practices from both opencode.ai and Claude documentation.

### Skills
Located in `home/.opencode/skills/<name>/SKILL.md`, these are globally installed to `~/.config/opencode/skills/<name>/SKILL.md` and available across all projects.

**Available Skills**:
- `add-storybook-heroui`: Configure Storybook for projects using HeroUI components
- `bun`: Use Bun as a JavaScript runtime, bundler, package manager, and test runner
- `coding-standards`: Follow coding standards and best practices when writing or reviewing code
- `cold-email-copywriting`: Write high-performing cold emails using research-backed frameworks
- `dotfiles-setup`: Manage dotfiles repository structure and setup
- `drizzle-orm`: Set up database layers, migrations, and queries with Drizzle ORM
- `git-commit`: Generate descriptive git commit messages by analyzing staged changes
- `github-pr`: Create and manage GitHub pull requests using gh CLI
- `merge-conflict`: Resolve git merge conflicts safely
- `nextjs-frontend`: Build and modify Next.js front-end applications with shadcn/ui
- `opencode-configuration`: Configure OpenCode settings, providers, models, agents, mcp, and skills
- `react-query-usequery-patterns`: Best practices for architecting useQuery calls in React Query / tRPC
- `resolve-git-merge-conflict`: Resolve merge conflicts by keeping code from both branches
- `search-corporate-logo`: Search and download SVG logos from SVGL.app
- `trpc`: Build end-to-end typesafe APIs with tRPC v11 in Next.js
- `ts-coding-skill`: TypeScript Node.js style guide for code consistency and best practices
- `typecheck-lint`: Run type checking and linting on codebases
- `usehooks-ts`: Use utility hooks from usehooks-ts instead of writing custom ones
- `writing-opencode-plugins`: Develop and publish OpenCode plugins
- `zod-ts`: Error handling using Zod for TypeScript runtime validation

Skills are loaded automatically by the `skill` tool when agents need them. Each skill includes YAML frontmatter with name, description, and optional metadata.
