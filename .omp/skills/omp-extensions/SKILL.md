---
name: omp-extensions
description: Debug loop for resolving ctx.models.resolve() returning undefined, config null overrides crashing getModelRole, and extension model resolution issues. Use when an extension command crashes on model lookup or resolve() silently returns undefined.
---

# Debug Loop for Extension Model Resolution

## The loop (as applied to `/z-rename` crash)

1. **Observe the crash.** `TypeError: null is not an object (evaluating 'this.get("modelRoles")[role]')` — the error names the function and the property. Read the line in the source.

2. **Read the crashing function.** `getModelRole()`:
   ```ts
   getModelRole(role) {
     return this.get("modelRoles")[role];
   }
   ```
   `this.get("modelRoles")` returns null. The DB settings table has the correct record, so something is overriding it.

3. **Find what sets `modelRoles` to null.** The settings engine merges: DB (persistent) < user config (higher priority). Something in the user config must be setting `modelRoles` → null.

4. **Read the config.** `~/.omp/agent/config.yml` or `.omp/config.yml`:
   ```yaml
   modelRoles:
   ```
   YAML `key:` with no value parses as null. This null value overrides the DB record in the merge. **Fix: remove the line.**

5. **Verify the fix.** Restart; the crash is gone. The extension now works but uses the wrong model (commit-grade model for a rename operation).

6. **Change the model role.** In the extension source, find the `resolve()` call:
   ```ts
   const commitModel = ctx.models.resolve("pi/commit");
   ```
   Change `"pi/commit"` → `"pi/smol"` — rename doesn't need the most capable model.

   `Variable name` and `error message` should match:
   ```ts
   const smolModel = ctx.models.resolve("pi/smol");
   if (!smolModel) {
     throw new Error("Smol model not configured");
   }
   ```

7. **Test resolution independently** before touching production code:
   ```ts
   ctx.ui.notify(JSON.stringify(ctx.models.resolve("pi/smol")), "info")
   ```
   Run via `omp --extension ./test-ext.ts`. If undefined, check:
   - `pi/` prefix? Role aliases require it — `resolve("smol")` treats the string as a bare model ID.
   - Role defined? `omp config get modelRoles` should show the role.
   - Model reachable? `ctx.models.list()` checks auth.

## What the loop caught

| Symptom | Catch mechanism | Would miss if… |
|---------|----------------|----------------|
| `modelRoles:` YAML null | Step 3-4: trace null → config | Config has invalid YAML that fails to parse (caught earlier by omp, but a partial parse could yield unexpected defaults) |
| Missing `pi/` prefix | Step 7: isolate resolve() | Used in a call that doesn't go through `resolve()` (unlikely; it's the only resolution entrypoint) |
| Wrong model role assigned | Step 6: deliberate choice per operation | None — step 6 makes the role explicit |
| Extension import failure | Not covered by this loop | Loop starts after the extension loads. Check: `omp --extension ./ext.ts` prints load errors; verify no syntax/import issues first |

## What the loop would NOT catch

**Silently degraded extension** — the extension loads, the model resolves, but produces wrong output because:
- The resolved model doesn't support the operation (e.g., a text-only model for a vision task).
- The role resolves to a throttled/rate-limited model and the extension doesn't handle latency.
- The extension uses a different `resolve()` call path (e.g., `resolveRaw()` instead of `resolve()`) that isn't covered by step 7.

**Config merge ambiguity** — multiple config files (user `~/.omp/agent/config.yml`, project `.omp/config.yml`, env overrides) override each other in unexpected ways. The loop reads one file, but the actual merge could involve more sources. Check with `omp config get <key>` to see the resolved value.

**Missing provider auth** — the role resolves to a valid model string (e.g., `"zai/glm-5.2:xhigh"`) but no API key is configured for `zai`. `ctx.models.list()` shows models, but inference fails at runtime. Loop's step 7 verifies resolution, not inference.

## Internal resolution path

`resolve(spec)` → `resolveModelRoleValue(spec, ...)` → `resolveConfiguredRolePattern(spec, settings)`:

- If spec has `pi/` prefix → `getModelRoleAlias()` strips prefix, checks against `MODEL_ROLE_IDS` → if match found, calls `getModelRole(role)` → resolves the value string.
- If no `pi/` prefix → treated as raw model string (`provider/id` or bare id).

## Commands reference

| Command | When to use |
|---------|-------------|
| `omp --extension ./ext.ts` | Run/load an extension; prints load errors (syntax, import failures) |
| `omp --extension ./test-ext.ts` | Isolated probe run — extension source with `ctx.ui.notify(...)` checks |
| `omp config get modelRoles` | Verify model role definitions are present in merged config |
| `omp config get <key>` | Check the resolved (merged) value of any config key across all sources |
| `ctx.ui.notify(JSON.stringify(ctx.models.resolve("pi/smol")), "info")` | Inline probe — prints resolution result at runtime before the real logic runs |
| `ctx.models.list()` | Verify the provider is reachable and models are available |
