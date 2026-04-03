---
description: Creates a git commit. Stages all if nothing is staged, refuses if partially staged. Uses opencode to generate the commit message.
---

## Smart Commit

This command creates a git commit. It handles three cases based on the staging area:

1. **All changes staged**: Generate commit message from staged diff and commit
2. **Nothing staged**: Stage everything (`git add -A`), generate commit message, and commit
3. **Partially staged**: Stop and tell the user to resolve the staging area first

## Workflow

1. **Check status**: Run `git status --porcelain` to determine the staging state
2. **Classify files**: Parse the status output to determine if all, none, or some files are staged
3. **Handle partial staging**: If some files are staged and some are not, stop and complain to the user
4. **Stage if needed**: If nothing is staged, run `git add -A`
5. **Generate message**: Use opencode to generate a short commit message from the diff (see command below)
6. **Commit**: Create the commit with the generated message

## Classification Logic

Parse each line of `git status --porcelain`:
- Lines starting with `??` are untracked (not staged, not modified)
- First character (column 1) indicates staging area status:
  - ` ` (space) = not staged
  - `A`, `M`, `D`, `R`, `C` = staged
- For lines starting with `??`, they are considered "not staged"

Count:
- `staged_count`: lines where column 1 is NOT a space (and not `??`)
- `modified_count`: lines where column 1 IS a space (but column 2 is not a space), plus `??` lines

Decision:
- If `staged_count > 0` AND `modified_count > 0`: **PARTIAL — stop and complain**
- If `staged_count > 0` AND `modified_count == 0`: **All staged — proceed**
- If `staged_count == 0` AND `modified_count > 0`: **Nothing staged — stage all, then proceed**
- If both are 0: **Nothing to commit — stop and tell the user**

## Commands to Use

```bash
# Check status
git status --porcelain

# Stage all changes (only if nothing is staged)
git add -A

# Get staged diff for commit message generation
git diff --cached

# Get short stat summary of staged changes
git diff --cached --stat

# Generate commit message using opencode
opencode run -m zai-coding-plan/glm-4.7-flashx --variant fast -p "Generate a short git commit message (1 line, under 72 characters) for the following staged changes. Output ONLY the commit message, nothing else: $(git diff --cached --stat)"

# Create the commit (replace MESSAGE with the generated message)
git commit -m "MESSAGE"
```

## Generating the Commit Message

Use `opencode run` to generate a concise commit message:

```bash
opencode run -m zai-coding-plan/glm-4.7-flashx --variant fast -p "Generate a short git commit message (1 line, under 72 characters) for the following staged changes. Output ONLY the commit message, nothing else.\n\n$(git diff --cached --stat)"
```

Then commit with the output:
```bash
git commit -m "<generated message>"
```

## Error Cases

- **Partially staged**: "Some files are staged and some are not. Please stage or unstage files so that everything you want to commit is in the staging area, then run this command again."
- **Nothing to commit**: "No changes to commit. Working tree is clean."
- **opencode run fails**: Fall back to asking the user for a commit message manually.
