# Detect and fix security vulnerabilities with uv and pip-audit

The goal is to find the worst vulnerabilities and make minimal changes to stay safe.
We make minimal changes to reduce the chance of breaking the app.

## Detect
Run `pip-audit`.

## Fix
Focus on critical and high vulnerabilities, unless told to otherwise.

For each such vulnerability, do the following:

- **If the vulnerability is in a dependency listed in `pyproject.toml`:**
  1. Use `uv add <dependency-name>@<safe-version>` to upgrade just that package (replace `<dependency-name>` with the actual package name and `<safe-version>` with a safe version).

- **If the vulnerability is in a dependency not listed in `pyproject.toml` (a transitive dependency):**
  1. Use `uv tree --package <dependency-name>` to see which version of the dependency we have resolved to (replace `<dependency-name>` with the actual package name).
  2. Follow the links in the original `pip-audit` message to see which versions are safe.
  3. Use the `pyproject.toml`'s `[tool.uv]` section with `override-dependencies` to pin the dependency to the lowest safe version.

## Update
After making the changes in the Fix section, run `uv sync` to install new dependencies.