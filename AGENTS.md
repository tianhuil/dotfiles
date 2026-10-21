# Dotfiles Mirror

`dotfiles/` is a Mirror directory in the unified workspace. Its content is
edited **only in this workspace repository**: never edit a `~/dotfiles` clone
and never edit the public repository directly.

The **Mirror Remote** is `https://github.com/tianhuil/dotfiles.git` on branch
`main`. A **Host Clone** is `~/dotfiles` on a machine: a read-only clone of
the Mirror Remote. GNU Stow creates links from a Host Clone into `$HOME`; the
deploy script runs its setup script (`setup.sh`, falling back to
`setup_links.sh` where there is no `setup.sh`).

## Workspace workflow

1. Edit files under `dotfiles/` in this workspace. In particular, edit
   `dotfiles/home/<pkg>/`, not files reached through a Host Clone's symlinks.
2. Commit dotfiles-only changes. A **Mixed Commit** touches files inside
   `dotfiles/` and outside it, and is not allowed.
3. Merge the commit to the workspace `main` branch.
4. From the workspace root, run `scripts/deploy-dotfiles.sh`. It checks the
   clean, merged state and the Mixed Commit guard, pushes `dotfiles/` to the
   Mirror Remote with `git subtree`, moves the **Deploy Marker** tag, then
   fast-forwards the Host Clones and runs their setup script (`setup.sh`, or
`setup_links.sh` where there is no `setup.sh`).

A Host Clone is a deployment target, not an editing checkout. Changes made in
this workspace reach `$HOME` only after deployment. Use the deploy script's
`--dry-run` option to check the first two steps without pushing or updating a
Host Clone.

## GNU Stow layout

The `home/` directory is the Stow root. Each package (`shell/`, `git/`,
`opencode/`, and so on) mirrors `$HOME` internally:

```
home/            ← Stow root
  shell/
    .bashrc       → ~/.bashrc
  git/
    .gitconfig    → ~/.gitconfig
  opencode/
    .config/opencode/…  → ~/.config/opencode/…
  agents/
    .agents/skills/<name>  → ~/.agents/skills/<name>
```

Within a Host Clone, symlinks are live, so deployed files are exposed through
`$HOME`. Do not edit through those links because that would change the Host
Clone; edit the matching workspace path instead. Re-run the same setup script
the deploy uses only after adding a new package or file. In the workspace, `git
diff` is the check for uncommitted dotfiles changes.

Detailed guidance for working in this directory lives in project skills under
`.agents/skills/`:

- `dotfiles-architecture`
- `dotfiles-shell-config`
- `dotfiles-skills-management`
- `dotfiles-agent-skills-cli`
- `dotfiles-orca-bin`
- `dotfiles-omp-validation`
- `dotfiles-typecheck`

## API Keys

| Service                 | File                                  | Env Var            |
| ----------------------- | ------------------------------------- | ------------------ |
| z.ai (web-search-prime) | `~/.config/opencode/zai-api-key`      | `ZAI_API_KEY`      |
| Context7                | `~/.config/opencode/context7-api-key` | `CONTEXT7_API_KEY` |

Load with: `export KEY_NAME=$(tr -d '\n\r' < ~/.config/opencode/<file>)`
