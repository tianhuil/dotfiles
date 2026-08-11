---
name: pi-package-publish
description: >-
  Getting a pi package listed on the pi.dev/packages gallery. Use when publishing a pi
  package to npm, adding the `pi-package` keyword or the `pi` manifest to package.json, or
  verifying a package shows up in the pi.dev/packages catalog.
---

# Listing a Pi Package on the pi.dev/packages Gallery

The gallery is an **npm keyword index, not a registry with a submission step**.
pi.dev/packages renders whatever the npm search API returns for `keywords:pi-package` — the
page fetches `https://registry.npmjs.org/-/v1/search?text=keywords:pi-package&size=250` in
pages (verified in the site source). Publish to npm with that keyword and the listing
appears automatically; there is no form or approval. The card's type badge and preview come
from the published manifest on the registry.

## Steps

1. **Declare resources.** Add a `pi` manifest to `package.json` (paths relative to the
   package root; globs and `!exclusions` supported) — or omit it and let conventional
   directories (`extensions/`, `skills/`, `prompts/`, `themes/`) be auto-discovered.

   ```json
   {
     "name": "my-package",
     "keywords": ["pi-package", "extension", "skill"],
     "pi": {
       "extensions": ["./extensions"],
       "skills": ["./skills"]
     }
   }
   ```

   *Done when:* every resource directory exists and is covered by the manifest.

2. **Add the keyword.** `"keywords": ["pi-package", ...]` is the only thing the gallery
   matches on. Add the type keyword(s) too — `extension`, `skill`, `theme`, `prompt`
   (pi-prefixed `pi-extension` or plural `extensions` forms also match) — so the card gets
   the right badge; the site falls back to the `pi` manifest keys when keywords don't name a
   type.

3. **Add a preview (optional).** `pi.video` (MP4, autoplays on hover, fullscreen on click) or
   `pi.image` (PNG/JPEG/GIF/WebP) renders as the card preview; video wins when both are set.

4. **Declare dependencies correctly.** Core pi packages — `@earendil-works/pi-ai`,
   `@earendil-works/pi-agent-core`, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`,
   `typebox` — go in `peerDependencies` with `"*"` and are never bundled. Other pi packages go
   in `dependencies` **and** `bundledDependencies`, referenced through `node_modules/` paths.

   *Done when:* `npm pack` tarball contains the resources and no bundled core packages.

5. **Publish to npm.** `npm publish` from the package root. The listing appears without any
   further step; npm's search index can lag the publish by a few minutes.

## Verify

The registry-manifest check is immediate; the search-index check confirms gallery visibility:

```bash
# 1. keyword on the published manifest (what the gallery reads for badge + preview)
curl -s https://registry.npmjs.org/<name>/latest | jq -r '.keywords[]' | grep -qx pi-package

# 2. present in the gallery's exact query (npm search: keyword qualifier + name token)
curl -s "https://registry.npmjs.org/-/v1/search?text=keywords:pi-package%20<name>&size=20" \
  | jq -r '.objects[].package.name' | grep -x "<name>"
```

*Done when:* both commands exit 0, and the card with the right type badge is searchable by
name on https://pi.dev/packages. If the manifest check passes but search lags, wait a few
minutes and re-run check 2.

## Reference

- Gallery: https://pi.dev/packages — a listing is only ever removed, never approved:
  a `package-report` GitHub issue with the `package-hide` label hides a card.
- Package docs: https://pi.dev/docs/latest/packages
- Starter template: the `pi-package-template` npm package.
- Users install with `pi install npm:<name>`.
