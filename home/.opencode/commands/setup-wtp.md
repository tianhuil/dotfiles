---
description: Setup wtp for git worktree management
agent: build
---

## Configuration

Create a `.wtp.yml` in your project root with this configuration based on this version:
- Copy the relevant *.env files
- make sure we run bun install

```yaml
version: "1.0"
defaults:
  base_dir: "./.wtp"

hooks:
  post_create:
    # Copy gitignored files from main worktree to new worktree
    - type: copy
      from: ".env"
      to: ".env"
    
    # Run setup commands in new worktree
    - type: command
      command: "bun install"
```

Make sure that `.gitignore` has `.wtp` folder ignored

```
.wtp
```
