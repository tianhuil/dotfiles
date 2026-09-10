---
name: python-coding-standards
description: Python code standards as good vs bad examples — comprehensions, type annotations, Pydantic validation, docstrings, keyword-only params, imports, error handling, naming, readability. Use when writing or reviewing Python code.
metadata:
  audience: developers
  workflow: coding
---

# Python Coding Standards

Good vs bad examples for writing clean, functional, type-safe Python.
For repo tooling (uv, ruff, mypy, pytest), see the `python-coding-setup` skill.

## Functional Style

Prefer comprehensions and generator expressions over `for`-loop accumulation:

```python
# ✅ Correct
names = [user.name for user in all_users]

# ❌ Incorrect
names = []
for user in all_users:
    names.append(user.name)

# ✅ Correct — filter + flatten
all_posts = [post for user in all_users if user.is_active for post in user.posts]

# ✅ Correct — lazy generator when the whole list isn't needed
total = sum(item.price for item in items)
```

Build dicts with comprehensions, not mutation:

```python
# ✅ Correct
user_map = {user.id: user for user in users}

# ❌ Incorrect
user_map: dict[str, User] = {}
for user in users:
    user_map[user.id] = user
```

Prefer immutable data and expressions over rebinding:

```python
# ✅ Correct
all_users = [*old_users, new_user]
x = 2 if y == 1 else 3

# ❌ Incorrect
old_users.append(new_user)
x = 2
if y == 1:
    x = 2
else:
    x = 3
```

Use `functools.reduce` only when a comprehension is unclear; otherwise isolate an accumulation loop in a small named helper.

## Types

### Strict typing

- Full annotations on every function signature (mypy/pyright `strict` enforces this)
- No `Any`; use `object` and narrow with `isinstance`
- No `cast()` — fix types upstream instead
- Use `typing.TypeIs` for type guards:

```python
# ✅ Correct
from typing import TypeIs

def is_user(data: object) -> TypeIs[User]:
    return isinstance(data, dict) and "id" in data and "name" in data

if is_user(data):
    reveal_type(data)  # User
```

```python
# ❌ Incorrect
user = data  # type: ignore[...]
user = cast(User, data)
```

### Use library and stdlib types — never duplicate them

```python
# ✅ Correct
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path

def load_config(paths: Iterable[Path]) -> Mapping[str, str]: ...

# ❌ Incorrect
def load_config(paths: list) -> dict:  # untyped builtins

# ❌ Incorrect — reinventing a protocol a library already provides
class MyPathLike:
    def read(self) -> str: ...
```

### Type shape preferences

```python
# ✅ Frozen dataclass for immutable records
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    x: float
    y: float

# ✅ Literal unions over enums
type UserRole = Literal["admin", "user", "guest"]

# ✅ Discriminated unions via Literal tags; narrow with match
type Shape = Circle | Rect

@dataclass(frozen=True)
class Circle:
    kind: Literal["circle"] = "circle"
    radius: float

@dataclass(frozen=True)
class Rect:
    kind: Literal["rect"] = "rect"
    width: float
    height: float

def area(shape: Shape) -> float:
    match shape:
        case Circle(radius=r):
            return math.pi * r * r
        case Rect(width=w, height=h):
            return w * h

# ✅ Tuple for fixed-length sequences
rgb: tuple[int, int, int] = (0, 128, 255)

# ✅ set for membership checks
done = {todo.id for todo in done_todos}
visible = [todo for todo in todos if todo.id in done]

# ✅ Optional chaining equivalents — early return on None
def street_of(user: User | None) -> str | None:
    if user is None or user.address is None:
        return None
    return user.address.street
```

Prefer dataclasses (or Pydantic models) over raw dicts and over hand-written `__init__`.

### Pydantic for validation

```python
# ✅ Correct
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    id: str
    name: str
    email: EmailStr

def validate_user(data: object) -> User | None:
    try:
        return User.model_validate(data)
    except ValidationError:
        return None
```

```python
# ❌ Incorrect — manual dict validation with casts
def validate_user(data: object) -> User | None:
    if not isinstance(data, dict):
        return None
    if not isinstance(data.get("id"), str):
        return None
    ...
```

## Functions

### Keyword-only parameters for 2+ arguments

```python
# ✅ Correct — * forces keyword-only args
def send_email(*, to: str, subject: str, body: str, attachments: Sequence[str] = ()) -> None: ...

send_email(to="user@example.com", subject="Welcome", body="Hello!")

# ✅ Correct — single-argument functions take the value directly
def validate_email(email: str) -> bool: ...

# ❌ Incorrect — long positional parameter lists
def send_email(to: str, subject: str, body: str) -> None: ...
```

### Docstrings on every top-level function/class (Google style)

```python
def calculate_total(items: Sequence[CartItem]) -> float:
    """Calculates the total price of items in a cart.

    Args:
        items: Cart items to calculate.

    Returns:
        The total price.
    """
    return sum(item.price for item in items)
```

Nested helper functions don't need docstrings.

### Named exports equivalent

Python needs no rule here — every `def` is importable by name. Keep a module's public API explicit via `__all__` when it matters.

## Imports

```python
# ✅ Correct — absolute imports, stdlib → third-party → local groups
import math
from collections.abc import Sequence

from pydantic import BaseModel

from myapp.utils.currency import format_currency

# ❌ Incorrect — deep relative parent imports
from ...utils.currency import format_currency
```

Order imports with `isort`/ruff `I` rules (enforced by ruff format in setup).

## Error Handling

`try`/`except` only at the root calling function; let intermediate exceptions propagate. Catch specific exceptions, never bare `except:`. Use `raise ... from err` when rewrapping:

```python
# ✅ Correct
def handle_user_request(request_id: str) -> None:
    try:
        data = fetch_data(request_id)
        save_result(process_data(data))
    except Exception as err:
        logger.error("Failed to handle user request: %s", err)
        raise

# ❌ Incorrect — try/except in every layer that only logs and re-raises
def fetch_data(request_id: str) -> Data:
    try:
        return client.get(f"/api/data/{request_id}")
    except Exception as err:
        logger.error("Failed to fetch data: %s", err)
        raise

# ❌ Incorrect — bare except, swallowed errors
try:
    ...
except:
    pass
```

Define small custom exception classes at module/package level instead of raising bare `ValueError`/`RuntimeError` in libraries.

## Multiline Strings

```python
# ✅ Correct
from textwrap import dedent

sql = dedent("""\
    SELECT users.id, users.name
    FROM users
    WHERE users.active = true
""")

# ❌ Incorrect — manual indentation mixed into the string
sql = "SELECT users.id, users.name\n  FROM users\n  WHERE users.active = true"
```

## Naming Conventions

- Functions, variables, modules: `snake_case`
- Classes, dataclasses, Pydantic models, exceptions: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Prefer self-documenting names over comments; reserve comments for complex business logic
- Prefer custom env vars over inferring modes: `if os.environ.get("RUN_MAGIC"): run_magic()`

## Readability

Return early; handle base/error cases first; reduce nesting:

```python
# ✅ Correct
def process(data: Data) -> Result | None:
    if not should_process(data):
        return None
    return compute_result(clean(data))
```

Prefer `match` over chained `if/elif` for 3+ structural branches; flatten compound conditionals:

```python
if a and b:
    return 1
if a:
    return 2
if b:
    return 3
return 4
```

Extract inner logic into well-named functions.

## Testing

Test deep conditional logic and untypable logic (e.g. units of measurement both typed as `float`). Prefer dependency injection for testability:

```python
# ✅ Correct — injectable clock
def in_20th_century(today: date | None = None) -> bool:
    today = today or date.today()
    return 1900 <= today.year < 2000
```

Run only the test you're writing (`uv run pytest tests/test_user.py::test_name`); ignore unrelated failures.
