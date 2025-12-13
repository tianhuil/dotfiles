# Setup Python Repository with uv

Set up a modern Python repository with best practices using `uv` for package management.

## Initial Setup

1. `git init` to create a git repo
2. Add `.gitignore` for Python
3. `uv init` to create a Python project
4. Update `pyproject.toml` with proper project metadata and Python version requirement:
   ```toml
   [project]
   readme = "README.md"
   requires-python = ">=3.14"

   [tool.poe.tasks]
   test = "pytest"
   lint = "ruff check ."
   format = "ruff format ."
   typecheck = "pyright"

   [tool.pyright]
   venvPath = "."
   venv = ".venv"

   [tool.ruff]
   line-length = 100

   [tool.ruff.lint]
   select = ["ALL"]
   ```

5. Add development dependencies to get the latest version:
   ```bash
   uv add --dev poethepoet pyright pytest ruff
   ```

## IDE Setup

5. Add `.vscode/settings.json` and `.vscode/extensions.json` to run ruff on save and enable pyright in the IDE. Do not put `.vscode` in `.gitignore`.

   Create `.vscode/settings.json`:
   ```json
   {
     "[python]": {
       "editor.formatOnSave": true,
       "editor.codeActionsOnSave": {
         "source.fixAll": "explicit",
         "source.organizeImports": "explicit"
       },
       "editor.defaultFormatter": "charliermarsh.ruff"
     },
     "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python"
   }
   ```

   And `.vscode/extensions.json`:
   ```json
   {
     "recommendations": [
       "ms-python.python",
       "ms-python.vscode-pylance",
       "charliermarsh.ruff"
     ]
   }
   ```
6. Create a sample python file with proper typing and docstrings

## Project Structure

Create a basic project structure:
- `main.py` or `your_module/__init__.py` - Main module
- `README.md` - Project documentation
- `AGENTS.md` - Coding guidelines (see below)

## Coding Guidelines

Add the following text as `AGENTS.md`:

```md
# Rules for python repos

## General

- Use `uv` for package manager.

## Coding Style

- Prefer to write functional code. Prefer list comprehensions for map, flatmap, and filter: `[func(x) for x in xs if condition(x)]`.
- Prefer to not mutate variables, even though Python allows mutation (pretend variables are all using typescript `const` not `let`).
- Explicitly type where practicable using pyright. Look at the libraries and import and use those types; do not make up types.
- Always avoid using type `Any` type.
- Add docstring to every class and function.
- Place `try`/`except` only at the root calling function. Do not place `try`/`except` in each intermediate or leaf function.
- If a library is missing a pyright type (e.g. `requests`), add the types as a development dependency (e.g. `types-requests`).
- For a multiline string, use `textwrap.dedent` and format nicely.

## Validation

Whenever you make a change, run `ruff` and `pyright` to confirm tests pass.
Use `git diff` and review code changes for following the rules under "Coding Style" section.

```
