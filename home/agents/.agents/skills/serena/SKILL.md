---
name: serena
description: >-
  Semantic code intelligence toolkit for symbol-level navigation, refactoring,
  and editing. Use when the user needs to navigate large codebases by symbol
  names/hierarchy, rename symbols across files, find references or
  implementations, get file symbol outlines, replace symbol bodies, insert
  before/after symbols, or perform safe deletes. Also use for project
  onboarding and persistent memory across sessions. Serena provides IDE-like
  capabilities (find_symbol, find_referencing_symbols, rename_symbol,
  replace_symbol_body, get_symbols_overview, etc.) that are more reliable and
  token-efficient than regex-based search-and-replace for structured code
  changes. Supports 40+ languages via LSP backends. Trigger when the user asks
  to refactor, navigate code semantically, find usages/references, rename across
  a project, or work with code symbols rather than raw text.
allowed-tools: Bash(mcpc *)
---

# Serena - Semantic Code Intelligence

Serena provides IDE-like semantic code tools operating at the symbol level.
It is more reliable and token-efficient than text-based search-and-replace for
structured code changes in large codebases.

**Prerequisite**: `uv` must be installed. `mcpc` (`npm install -g @apify/mcpc`) for persistent sessions.

## Architecture

Serena has two interfaces:

1. **CLI** — project management only (`init`, `project`, `config`, `tools`, etc.)
2. **MCP server** — exposes symbol-level tools (`find_symbol`, `get_symbols_overview`,
   `rename_symbol`, etc.) via the Model Context Protocol

The symbol-level tools are **not available as direct CLI commands**. They must be
invoked via the MCP server using `mcpc`.

## Setup

### Initial setup (one-time)

```bash
uvx --from git+https://github.com/oraios/serena serena init
```

### Create a project (per project, from project root)

```bash
uvx --from git+https://github.com/oraios/serena serena project create --index
```

This creates a `.serena/` directory with configuration and enables semantic
features. Run this in each project you want to use Serena with.

### Index a project (for large codebases)

```bash
uvx --from git+https://github.com/oraios/serena serena project index
```

Pre-caches symbol information to avoid delays on first use.

## Using Symbol Tools

### Start a background server

Start one server per project. It picks a random port in 8000-9000 to avoid
collisions when multiple projects are open simultaneously.

```bash
SERENA_PORT=$(shuf -i 8000-9000 -n 1)
echo "Serena starting on port $SERENA_PORT"
SERENA_URL="http://127.0.0.1:$SERENA_PORT/mcp"
uvx --from git+https://github.com/oraios/serena serena start-mcp-server \
  --project-from-cwd --transport streamable-http --port "$SERENA_PORT" --log-level WARNING &
# Wait for server to be ready
for i in $(seq 1 30); do
  curl -sf -X POST "$SERENA_URL" -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"ping","version":"1.0"}}}' \
    >/dev/null 2>&1 && break
  sleep 0.5
done
echo "Serena ready at $SERENA_URL"
```

### Invoke tools via mcpc

With a running server and active `@serena` session, each call takes ~0.4s:

```bash
mcpc connect "http://127.0.0.1:$SERENA_PORT/mcp" @serena --no-profile

mcpc @serena tools-call get-symbols-overview relative_path:=src/main.py
mcpc @serena tools-call find-symbol name_path_pattern:=MyClass
mcpc @serena tools-call find-referencing-symbols name_path:=MyClass relative_path:=src/main.py
mcpc @serena tools-call rename-symbol name_path:=old_name relative_path:=src/main.py new_name:=new_name
```

Use `mcpc --json @serena tools-call ...` for machine-readable output.

### Stopping the server

```bash
kill %1  # or the PID printed at startup
```

### Multiple projects / agents

- **One server per repo**: each on its own port. Agents working the same repo
  share the server for read-only tools.
- **Write tools** (`rename_symbol`, `replace_symbol_body`) mutate the codebase —
  coordinate if multiple agents are editing.
- **Different repos**: use separate servers on different ports.

## CLI Commands (project management only)

Replace `uvx --from git+https://github.com/oraios/serena serena` with the
shortcut `SERENA` below.

```bash
SERENA project create [--index] [--name NAME] [--language LANG]
SERENA project index
SERENA project health-check
SERENA config edit
SERENA tools list --all
SERENA tools description <tool_name>
SERENA context list
SERENA mode list
```

## Key Capabilities (MCP tools)

### Symbol Navigation

- **find_symbol**: Search for symbols globally or within a file using the
  language server. Use name path patterns (e.g. `MyClass/my_method`).
- **get_symbols_overview**: Get a file outline listing top-level symbols.
- **find_declaration**: Jump to where a symbol is defined.
- **find_implementations**: Find all implementations of an interface/abstract
  symbol.
- **find_referencing_symbols**: Find all usages of a symbol across the codebase.

### Refactoring

- **rename_symbol**: Rename a symbol across the entire project semantically
  (updates all references, not just text matches).
- **safe_delete_symbol**: Delete a symbol after checking for remaining usages.

### Symbolic Editing

- **replace_symbol_body**: Replace the full definition of a symbol.
- **insert_after_symbol**: Insert content after a symbol's definition.
- **insert_before_symbol**: Insert content before a symbol's definition.
- **replace_content**: Replace text in a file (literal or regex mode).

### Memory System

- **write_memory**: Store project knowledge for future sessions.
- **read_memory**: Retrieve previously stored project knowledge.
- **list_memories**: List all available memories.
- **edit_memory**: Update existing memories.
- **delete_memory**: Remove a memory.

Memories are stored in `.serena/memories/` within the project directory.

## Supported Languages

40+ languages including: Python, TypeScript, JavaScript, Go, Rust, Java, C/C++,
C#, Kotlin, Ruby, PHP, Swift, Scala, Haskell, Elixir, Zig, and more.

## When to Use Serena vs Built-in Tools

| Task | Use |
|------|-----|
| Rename a symbol across files | Serena `rename_symbol` |
| Find all references to a function | Serena `find_referencing_symbols` |
| Get file structure/outline | Serena `get_symbols_overview` |
| Navigate to definition | Serena `find_declaration` |
| Replace a function body | Serena `replace_symbol_body` |
| Simple text search | Built-in grep/search |
| Read a file | Built-in read |
| Non-code file operations | Built-in tools |

## Important Notes

- Always run from within the project directory for correct project detection.
- For the first use in a project, run `serena project create --index` first.
- Serena works best with well-structured code and type annotations.
- Start from a clean git state when doing refactoring tasks.
- The `.serena/` directory should be committed to version control (except
  `project.local.yml` which contains local overrides).
