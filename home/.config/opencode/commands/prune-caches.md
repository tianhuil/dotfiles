---
description: Prune package manager caches. Keeps only the latest version per package in bun, pnpm, uv, cargo, npm, and yarn caches.
---

## Prune Caches

Run cache cleanup for all available package managers:

```bash
# bun: keep only latest version per package
cd ~/.bun/install/cache && for d in *@*; do
  [ -d "$d" ] || continue
  name="${d%%@*}"
  ver="${d#$name@}"; ver="${ver%%@@@1}"; ver="${ver%%/}"
  echo "$name|$ver|$d"
done | sort -t'|' -k1,1 -k2,2V | awk -F'|' '
  $1 != prev { prev=$1; last=$3; next }
  { print last; last=$3 }
' | xargs -r rm -rf

# pnpm: remove unreferenced packages
pnpm store prune 2>/dev/null

# uv: prune unreachable cache entries
uv cache prune 2>/dev/null

# npm: clear cache
npm cache clean --force 2>/dev/null

# yarn: clear cache
yarn cache clean 2>/dev/null

# Report savings
echo "Done. Check ~/.bun/install/cache/ for remaining size."
du -sh ~/.bun/install/cache/
```
