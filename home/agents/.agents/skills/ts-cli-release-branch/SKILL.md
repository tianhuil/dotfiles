---
name: ts-cli-release-branch
description: >-
  Ship a TypeScript or Node CLI from GitHub without npm publish: a `release`
  branch holding the built `dist/`, version tags, and
  `github:<owner>/<repo>#vX.Y.Z` installs. Use when setting up releases or
  distribution for a CLI, or when an install from a `github:` spec fails or is
  missing `dist/`.
---

# TypeScript CLI release branch

`main` holds source only; `dist/` is gitignored there. On each push to `main`, a script checks for tag `v<package.json version>`. If it doesn't exist, the script builds, commits `main`'s tree plus `dist/` to the `release` branch (parents: the previous release and the `main` commit), tags it, pushes, and creates a GitHub Release. **To release, bump `version`.** Users then run `npm i -g` / `pnpm add -g` / `bun add -g` / `npx` on `github:<owner>/<repo>#vX.Y.Z`.

**The reference repo is https://github.com/tianhuil/ts-cli-release-branch.** Its CI checks every install route on each push. It is the single source of truth for the scripts, the workflow, the `tsconfig`, and the user-facing install docs. Copy from it rather than rewriting, and read its README for anything this skill doesn't cover.

## Steps

1. **Copy three files** from the reference repo's `main` into the target repo, at the same paths:
   ```sh
   base=https://raw.githubusercontent.com/tianhuil/ts-cli-release-branch/main
   mkdir -p scripts .github/workflows
   for f in scripts/release.sh scripts/try-release.sh .github/workflows/release.yml; do curl -fsSL "$base/$f" -o "$f"; done
   chmod +x scripts/*.sh
   ```
   In `release.yml`, set `BIN` in the `verify-install` job to the target's command name, or delete that job. Match the setup steps (pnpm, Bun, or npm, and the Node version) to the target's package manager. The script reads the build command from the lockfile; set `BUILD_CMD` if the build script isn't called `build`.
2. **Shape `package.json`:**
   - `bin` points at built `.js` in `dist/`. The built file starts with `#!/usr/bin/env node`. Node won't run `.ts` from `node_modules`, so a TypeScript `bin` works only for Bun users.
   - `"files": ["dist"]`, plus any other runtime paths. Without it, installers apply `.gitignore` and can drop `dist/`.
   - `version` set to the first version to release.
3. **Stop tracking `dist/` on `main`:** add `dist/` to `.gitignore`, run `git rm -r --cached dist`, and delete any check that the committed `dist/` matches a fresh build.
4. **Try the release locally:** commit, then run `scripts/try-release.sh --install`. It builds the release commit (`release.sh --dry-run`), packs it the way installers will, and installs the tarball globally with npm. Done when `<cmd> --version` prints the new version. Both scripts refuse to run with uncommitted changes.
5. **Release:** commit, push `main`, and watch the workflow. Done when the release job prints `Released vX.Y.Z` and a fresh install from `github:<owner>/<repo>#vX.Y.Z` prints that version (the `verify-install` job checks this seven ways).
6. **Document installs** in the target README: copy the badges, the install block and "Pitfalls" from the reference README, with the owner, repo and command name changed.

## Gotchas

- **Lifecycle scripts:** npm reinstalls dev dependencies for a git dependency whose `scripts` include `build`, `prepare`, `prepack`, `install`, `preinstall` or `postinstall`, and `npm install -g` then fails (`ENOTDIR`, or a link to a deleted temp clone). `release.sh` removes them from the release commit only. Keep that step when editing the script.
- **Git identity on the runner:** `commit-tree` and `git tag -a` fail without one. The workflow sets `github-actions[bot]`.
- **Stale `#release`:** `pnpm dlx` and `bunx` reuse a cached copy after the branch moves. Pin `#vX.Y.Z` in docs and scripts.
- **`bunx` with a bare name** resolves from the npm registry, so it can run an unrelated package. Pass the full `github:` spec.
- **Yarn 2+** has no global installs; use `yarn dlx`.
- **Shadowed commands:** each package manager has its own global bin directory, and `pnpm link --global` / `bun link` from a clone adds another. Check with `which <cmd>` and `<cmd> --version`.
- **Running from a clone without building:** `node src/cli.ts` works on Node ≥ 22.18 only if imports use `.ts` extensions and `tsconfig` sets `rewriteRelativeImportExtensions` (see the reference `tsconfig.json`).
