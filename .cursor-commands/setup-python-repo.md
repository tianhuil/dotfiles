# Setup Python Repository with uv

Set up a modern Python repository with best practices using `uv` for package management.

1. `git init` to create a git repo
2. `uv init` to create a bun repo
3. Install `ruff` for linting and formatting
4. Use `pyright` for typechecking.
5. Add `.vscode/setting.json` and `.vscode/extension.json` to run ruff on save
6. Create a sample file

Then add the following text as `AGENTS.md`

```md
# Rules for python repos

## General

- Use `uv` for package manager.

## Coding style

- Prefer to write functional code. Prefer list comprehensions for map, flatmap, and filter: `[func(x) for x in xs if condition(x)]`.
- Prefer to not mutate variables, even though Python allows mutation (pretend variables are all using typescript `const` not `let`).
- Explicitly type where practicable using mypy. Look at the libraries and import and use those types; do not make up types.
- Always avoid using type `Any` type.
- Add docstring to every class and function.
- Place `try`/`except` only at the root calling function. Do not place `try`/`except` in each intermediate or leaf function.

## Validation

Whenever you make a change, run `ruff` and `pyright` to confirm tests pass.

```
