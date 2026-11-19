---
name: free-disk-space
description: >-
  Free disk space safely on a dev machine. Use on "No space left on device",
  ENOSPC, or a disk-full error, or when the user asks what is filling the disk
  or what they can prune.
---

# Free disk space

Work through the TODOs in order. Paths marked _e.g._ are where things lived on
our Linux server; on another machine, use the "find it" command instead.

## Rules for every deletion

- **Live** path: a running process has its working directory inside it. Skip
  Live paths. Find them with
  `for p in /proc/[0-9]*; do readlink $p/cwd; done 2>/dev/null | sort | uniq -c | sort -rn`
  (macOS: `lsof -d cwd`).
- **Fresh** path: anything inside it was modified in the last 2 days. Skip
  Fresh paths. Test with `[ -n "$(find "$d" -mtime -2 -print -quit)" ]`.
- Never touch your own session's scratch directory.
- Append every removed path to a cleanup log in your scratchpad.
- Record `df -h /` before and after. Only that difference is a measured saving;
  per-item `du` figures are estimates.

## TODOs

- [ ] **1. Measure.** Run in parallel, `timeout` ≥ 300s:
  - `df -h / /home`
  - `du -xh --max-depth=1 ~ | sort -rh | head -25`, then one level deeper into
    the top 3
  - `sudo du -xh --max-depth=1 /tmp /var/lib /opt | sort -rh | head -20`
  - `sudo docker system df` (if Docker exists)
  - Save `node_modules` sizes once:
    `find ~ -xdev -type d -name node_modules -prune -not -path '*/.*/*' | xargs -d '\n' du -sk | sort -rn > <scratchpad>/nmsizes.txt`

- [ ] **2. Propose.** Show the user one table: item, size, safe or ask-first.
  If they asked only to investigate, stop here. Otherwise do the Safe items
  (3–8) and ask about 9.

- [ ] **3. Agent scratch in /tmp** (usually the biggest win).
  - Find it: `sudo du -xsh /tmp/* /tmp/.[!.]* | sort -rh | head -30`.
  - Claude Code scratch is `/tmp/claude-<uid>/<project>/<session>/`
    (_e.g._ `/tmp/claude-1000`, was 13G). Delete session dirs that are not
    Fresh.
  - Other /tmp entries: delete ones you own that are not sockets and not
    Fresh. Always skip `tmux-*`, `ssh-*`, `.X*`, `.ICE*`, `systemd-*`, `snap-*`,
    `.mount_*` (mounted AppImages; `du` gets permission denied on them).

- [ ] **4. Docker.** `sudo docker image prune -a -f` and
  `sudo docker builder prune -a -f` (_e.g._ freed 13G). Volumes may hold
  data: go to 9.

- [ ] **5. Package caches.**
  - pnpm metadata: `rm -rf ~/.cache/pnpm` (_e.g._ 5.7G; re-downloaded on
    demand).
  - pnpm store: one directory per store version under `pnpm store path`'s
    parent (_e.g._ `~/.local/share/pnpm/store/{v3,v10,v11}`). Each pnpm major
    prunes only its own store, so run `pnpm store prune` from one project
    pinned to each pnpm major in use (find them with
    `grep -h '"packageManager"' ~/*/package.json ~/*/*/package.json | sort | uniq -c`).
  - Delete a whole store version directory only after that grep shows no
    project uses its pnpm major. pnpm ≤9 uses `v3`; we deleted `v3` while a
    pnpm 9 project was installing and it re-downloaded 2G.
  - Bun: keep the latest version per package in `~/.bun/install/cache` (the
    `prune-caches` skill does this, if installed).
  - `npm cache clean --force`; delete `~/.npm/_npx/*` that is not Fresh (_e.g._ 2.3G → 135M).
  - `uv cache prune`, `yarn cache clean` where installed.

- [ ] **6. Old tool versions.** Keep the current one plus the newest previous.
  - Playwright browsers: `~/.cache/ms-playwright/chromium-*`,
    `chromium_headless_shell-*`, `ffmpeg-*` (Linux; macOS uses
    `~/Library/Caches/ms-playwright`).
  - Node: `nvm ls`, then `nvm uninstall` versions that are neither current nor
    default.
  - Claude Code: `~/.local/share/claude/versions/*`; check `claude --version`
    first.

- [ ] **7. Merged worktrees.** For each repo, `git worktree list`; for each
  branch, check the PR state (`gh pr list --head <branch> --state all`) or
  `git merge-base --is-ancestor <branch> origin/<default>`. Remove a worktree
  with `git worktree remove` only when it is merged, clean, and not Live; then
  run `git worktree prune`. For Orca-managed workspaces use the `clean-up-orca`
  skill.

- [ ] **8. node_modules in idle projects.** An idle project has no commits in
  1+ week and is neither Live nor Fresh. Delete its
  `node_modules` using `nmsizes.txt`. With pnpm, `node_modules` are hard links
  into the store, so this frees almost nothing until you rerun
  `pnpm store prune` (step 5) afterwards.

- [ ] **9. Ask first, one line each with size and why.**
  - Live paths holding big targets: show PID, start time, command. Kill only
    with approval: `kill -HUP` first, then `kill -TERM` survivors. In zsh, pass
    PIDs as an array, not a string.
  - Dirty or orphaned worktrees (the `.git` file's `gitdir:` target is
    missing): save `git diff` and untracked files as a patch before removal.
  - Docker volumes: `docker volume prune` removes anonymous ones; named ones
    may hold database data.
  - Agent session logs (_e.g._ `~/.pi/agent/sessions`, 1.7G).
  - Large forks or clones the user is still working in.

- [ ] **10. Prevent recurrence** (needs sudo; ask). Ubuntu deletes /tmp files
  only after 30 days (`/usr/lib/tmpfiles.d/tmp.conf`), far slower than agents
  fill it. Suggest `/etc/tmpfiles.d/tmp.conf` containing
  `D /tmp 1777 root root 3d`.

- [ ] **11. Report.** Before/after `df -h /`, a table of what was freed,
  what was skipped and why, the cleanup log path, and a "Not verified" list
  (at least: projects whose `node_modules` were deleted still install).
