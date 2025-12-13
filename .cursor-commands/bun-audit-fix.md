# Detect and fix security errors 

## Detect
Run `bun audit`.

## Fix
Focus on critical and high vulnerabilities, unless told to otherwise.

For each such vulnerability, do the following:

- **If the vulnerability is in a dependency listed in `package.json`:**
  1. Use `bun update [dependency]` to upgrade just that package.

- **If the vulnerability is in a dependency not listed in `package.json` (a transitive dependency):**
  1. Use `bun why [dependency]` to see which version of the dependency we have resolved to.
  2. Follow the links in the original `bun audit` message to see which versions are safe.
  3. Use the `package.json`'s `resolutions` field to pin the dependency to the lowest version that is safe.

## Update
After making the changes in the Fix section, run `bun i` to install new dependencies.
