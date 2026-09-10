---
name: python-coding-setup
description: One-time Python repo setup with uv — pyproject.toml, pinned Python, ruff lint/format, mypy strict, pytest, and daily validation commands. Use when creating or bootstrapping a Python repo, or when a repo lacks tooling.
metadata:
  audience: developers
  workflow: setup
---

# Python Repo Setup (uv)

One-time setup for a Python repo: uv, ruff, mypy, pytest.
Coding style itself lives in the `python-coding-standards` skill.

## uv Basics

Always use [uv](https://docs.astral.sh/uv/); never raw `pip`, `pip-tools`, `poetry`, or
hand-managed venvs. uv manages `.venv`, the lockfile, and Python versions.

```bash
# New project (creates pyproject.toml, .python-version, .gitignore, .venv)
uv init --app            # application layout
uv init --lib            # library layout with src/
uv init --no-readme      # minimal

# Pin the interpreter version (commit .python-version)
uv python pin 3.12

# Dependencies
uv add httpx             # runtime dep
uv add --dev ruff mypy pytest  # dev deps (dependency-groups)
uv remove httpx
uv lock                  # refresh lockfile only
uv sync                  # install exactly what's locked (run on clone)
```

Rules:

- Commit `uv.lock`, `pyproject.toml`, and `.python-version`; ignore `.venv/`.
- Run everything through `uv run` so the project env is used: `uv run pytest`,
  `uv run python main.py`.
- On a fresh clone: `uv sync` and you're done.

## ruff (lint + format in one)

Single tool replacing flake8/isort/black:

```bash
uv add --dev ruff
```

`pyproject.toml` config:

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
  "E",   # pycodestyle errors
  "W",   # pycodestyle warnings
  "F",   # pyflakes
  "I",   # isort (import ordering)
  "UP",  # pyupgrade (modern syntax)
  "B",   # bugbear (likely bugs)
  "SIM", # simplify
  "RUF", # ruff-specific rules
]
```

Migrating a black/flake8/isort repo: `uvx ruff check .` first, then remove old tools.

## mypy (strict type checking)

```bash
uv add --dev mypy
```

```toml
[tool.mypy]
strict = true
```

(Alternative: `pyright` via `uv add --dev pyright` — pick one.)

## pytest

```bash
uv add --dev pytest
```

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-q"
```

## Entry points

CLI entry (installed into the venv by `uv sync`):

```toml
[project.scripts]
myapp = "myapp.cli:main"
```

## Daily loop after setup

```bash
# After each non-trivial change
uv run mypy . && uv run ruff check --fix . && uv run ruff format .

# Targeted tests only — never the whole suite while iterating
uv run pytest tests/test_user.py::test_validates_email

# Review your diff against python-coding-standards before finishing
git diff
```

If errors appear in files another agent is editing, fix only files you touched.
