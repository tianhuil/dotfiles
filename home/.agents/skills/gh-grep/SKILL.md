---
name: gh-grep
description: Find real-world code examples from over a million public GitHub repositories. Use this skill when you need to search GitHub for code patterns, find usage examples of libraries/APIs, or discover how developers implement specific patterns. Use when implementing unfamiliar APIs, checking correct syntax, or looking for production-ready examples. Triggers include searching GitHub code, finding code examples, or exploring how libraries are used in practice.
allowed-tools: Bash(uvx mcp2cli --mcp https://mcp.grep.app *)
---

# GitHub Code Search via mcp2cli

Search real-world code from public GitHub repositories using [grep.app](https://grep.app).

## Install

```bash
uvx mcp2cli --mcp https://mcp.grep.app --list
```

Requires `uv` (Python package runner). First run auto-installs mcp2cli.

## Usage

```bash
uvx mcp2cli --mcp https://mcp.grep.app search-git-hub --query "PATTERN" [options]
```

### Parameters

| Flag | Description |
|------|-------------|
| `--query QUERY` | Literal code pattern to search (e.g. `useState(`, `export function`) |
| `--use-regexp` | Interpret query as regex (prefix with `(?s)` for multiline) |
| `--match-case` | Case-sensitive search |
| `--match-whole-words` | Match whole words only |
| `--repo REPO` | Filter by repo (e.g. `facebook/react`, `vercel/` for org) |
| `--path PATH` | Filter by file path (e.g. `/route.ts`, `src/components/`) |
| `--language LANGUAGE` | Filter by language (JSON array: `'["TypeScript","TSX"]'`) |
| `--pretty` | Pretty-print JSON output |
| `--head N` | Limit to first N results |

### Examples

```bash
uvx mcp2cli --mcp https://mcp.grep.app search-git-hub --query "getServerSession" --language '["TypeScript","TSX"]'

uvx mcp2cli --mcp https://mcp.grep.app search-git-hub --query "(?s)useState\(.*loading" --use-regexp --language '["TSX"]'

uvx mcp2cli --mcp https://mcp.grep.app search-git-hub --query "CORS(" --match-case --language '["Python"]'

uvx mcp2cli --mcp https://mcp.grep.app search-git-hub --query "export function" --repo "facebook/react"

uvx mcp2cli --mcp https://mcp.grep.app search-git-hub --query "getServerSession" --path "/route.ts"
```

## Tips

- Search for **actual code patterns** that would appear in files, not keywords like "how to use"
- Use `(?s)` prefix in regex for multiline patterns: `--query "(?s)try {.*await" --use-regexp`
- Use `--language` with JSON array format: `--language '["TypeScript"]'`
- Use `--head 5` to limit results and reduce token usage
- Use `--pretty` for readable output when exploring
- Results include file paths, line numbers, and code snippets
