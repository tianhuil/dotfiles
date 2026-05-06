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
---

# Serena - Semantic Code Intelligence

Serena provides IDE-like semantic code tools operating at the symbol level.
It is more reliable and token-efficient than text-based search-and-replace for
structured code changes in large codebases.

**Prerequisite**: `uv` must be installed. Run Serena via:

```bash
uvx --from git+https://github.com/oraios/serena serena
```

## Setup

### Initial setup (one-time)

```bash
uvx --from git+https://github.com/oraios/serena serena init
```

### Create a project

```bash
uvx --from git+https://github.com/oraios/serena serena project create --index
```

This creates a `.serena/` directory in the project with configuration and
enables semantic features. Run this in each project you want to use Serena with.

### Index a project (for large codebases)

```bash
uvx --from git+https://github.com/oraios/serena serena project index
```

Pre-caches symbol information to avoid delays on first use.

## CLI Commands

Replace `uvx --from git+https://github.com/oraios/serena serena` with the
shortcut `SERENA` below.

### Project management

```bash
SERENA project create [--index] [--name NAME] [--language LANG]
SERENA project index
SERENA project health-check
SERENA config edit
```

### Tool inspection

```bash
SERENA tools list --all
SERENA tools description <tool_name>
```

### Contexts and modes

```bash
SERENA context list
SERENA mode list
```

## Key Capabilities

### Symbol Navigation

- **find_symbol**: Search for symbols globally or within a file using the
  language server. Use symbol names or path patterns (e.g. `MyClass.my_method`)
  instead of regex.
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
