---
description: Resolves merge conflicts by keeping code from both branches
agent: build
---

## Conflict Markers

```
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> branch-name
```

## Resolution Workflow

1. **View conflicts**: `git status`
2. **Edit file**: Remove markers, combine changes from both branches
3. **Stage resolved file**: `git add <file>`
4. **Complete merge**: `git merge --continue`

## Principles

- Understand what each branch changed before resolving
- Keep code from both branches when possible
- If the changes logically conflict (so that you cannot reasonably keep changes from both branches) then don't make any edits and report that to the user.
- Remove all three markers: `<<<<<<<`, `=======`, `>>>>>>>`

## Reporting

When you are done, report back to the user what you did or why you were unable to resolve the merger conflict.
