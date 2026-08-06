---
name: dotfiles-typecheck
description: TypeScript validation in the dotfiles repo. Use after editing any .ts file under home/ or .omp/. Documents `bun typecheck` (tsc --noEmit) and why tsconfig uses explicit include paths instead of **/*.ts (hidden .config directories are not traversed by glob).
---

# Validation

TypeScript changes are validated with:

```bash
bun typecheck
```

This runs `tsc --noEmit` against all `.ts` files in `home/` and `.omp/`.
Since `.config` is a hidden directory, the `include` patterns are explicit paths
rather than `**/*.ts` (which doesn't traverse hidden directories).

Always run `bun typecheck` after editing any `.ts` file in the repo.
