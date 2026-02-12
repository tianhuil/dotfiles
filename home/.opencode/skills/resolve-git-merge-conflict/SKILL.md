---
name: resolve-git-merge-conflict
description: Resolves merge conflicts by keeping code from both branches. Use when git merge encounters conflicts that need manual resolution with a text editor.
license: MIT
compatibility: opencode
metadata:
  audience: users
  workflow: git
---

# Resolve Git Merge Conflicts

## Conflict markers

```
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> branch-name
```

## Resolution workflow

1. **View conflicts**: `git status`
2. **Edit file**: Remove markers, combine changes from both branches
3. **Stage resolved file**: `git add <file>`
4. **Complete merge**: `git merge --continue`

## Principles

- Understand what each branch changed before resolving
- Keep code from both branches when possible
- Remove all three markers: `<<<<<<<`, `=======`, `>>>>>>>`
