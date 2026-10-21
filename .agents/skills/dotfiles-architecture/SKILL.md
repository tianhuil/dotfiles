---
name: dotfiles-architecture
description: Editing the workspace dotfiles Mirror's GNU Stow layout. Use when adding or editing files under dotfiles/home/<pkg>/, adding a new stow package, checking config drift, or understanding deployment. Covers the home/ stow root, Host Clones, and the workspace-only editing workflow.
---

# Dotfiles Architecture

`dotfiles/` is a Mirror directory in the unified workspace. It is the only
place where dotfiles content is edited. The **Mirror Remote** is
`https://github.com/tianhuil/dotfiles.git` on branch `main`.

A **Host Clone** is `~/dotfiles` on a machine. It is a read-only clone of the
Mirror Remote; GNU Stow links its files into `$HOME`. Do not edit a Host Clone
or the public repository directly. The existing `setup.sh` in the Host Clone
is unchanged.

## GNU Stow directory

The `dotfiles/home` folder is the **Stow root**. It contains per-package
subdirectories (`shell/`, `git/`, `ssh/`, `opencode/`, and so on), each
mirroring `$HOME` internally. Running the unchanged `setup.sh` in a Host Clone
invokes `stow` to symlink each package's files into `$HOME`.

```
dotfiles/home/            ← Stow root
  shell/
    .bashrc       → ~/.bashrc
    .coreenv      → ~/.coreenv
  git/
    .gitconfig    → ~/.gitconfig
  opencode/
    .config/opencode/…  → ~/.config/opencode/…
  agents/
    .agents/skills/<name>  → ~/.agents/skills/<name>
```

Because the links are live, deployed files are exposed through `$HOME`.
That does not make the Host Clone an editing checkout: do not edit through
those links, because that would change the Host Clone. Make the change instead
at the matching path under `dotfiles/home/<pkg>/` in this workspace, then
deploy it.

The setup script also handles steps Stow cannot express, including gitconfig,
submodule initialization, plugin builds, and RTK integration.

## Workspace deployment

1. Commit only files under `dotfiles/`. A **Mixed Commit** touches files both
   inside and outside `dotfiles/` and is rejected by deployment.
2. Merge the commit to the workspace `main` branch.
3. From the workspace root, run `scripts/deploy-dotfiles.sh`.

The deploy script requires a clean tree and `HEAD == origin/main`, checks
commits since the **Deploy Marker**, runs the Mixed Commit guard, and pushes
the `dotfiles/` subtree to the Mirror Remote. It then moves the Deploy Marker,
fast-forwards the Host Clones, and runs their unchanged `setup.sh`. Use
`--dry-run` to perform the checks without pushing or updating a Host Clone.

For workspace review, use `git diff` and `git status`. Adding a package or a
new file may require `setup.sh` to be run by deployment; ordinary edits do not
require a local Stow command.
