---
name: curl-cffi
description: >-
  Fetch web content with browser impersonation using curl_cffi. Use when
  web_fetch is unavailable or returns blocked/empty responses, or when TLS
  fingerprint-based blocking is detected. Triggers include "fetch URL",
  "scrape page", "impersonate browser", or any web fetch that fails with
  built-in tools.
---

# curl-cffi — Impersonated Web Fetch

Fetches web pages with browser impersonation, bypassing TLS fingerprint-based
blocking. Supports HTTP/2 and HTTP/3 out of the box.

**Prerequisite**: `uv` must be installed. Run curl-cffi via:

```bash
uvx --from git+https://github.com/lexiforest/curl_cffi curl-cffi
```

## When to use

- When `web_fetch` is unavailable or returns blocked/empty responses
- When a website requires a real browser TLS fingerprint
- When you need to fetch API endpoints, HTML pages, or JSON resources

## CLI Usage

Replace `uvx --from git+https://github.com/lexiforest/curl_cffi curl-cffi` with
the shortcut `CURL_CFFI` below.

```text
CURL_CFFI METHOD URL [REQUEST_ITEMS...] [FLAGS]
```

- **METHOD** is required: `get`, `post`, `put`, `delete`, `patch`, `head`,
  `options`, `trace`, `query` (case-insensitive).
- **URL** is required. Bare domains default to `https://`. A leading colon is a
  localhost shortcut (`:3000` → `http://localhost:3000`). An explicit port other
  than 443 uses `http://`.

## Common patterns

```bash
# Simple GET (impersonates Chrome by default)
CURL_CFFI get https://httpbin.org/get

# Body only (best for parsing)
CURL_CFFI get --body https://httpbin.org/get

# POST JSON data
CURL_CFFI post https://httpbin.org/post name=John age:=30

# Custom header
CURL_CFFI get https://httpbin.org/get X-My-Header:value

# Impersonate Safari
CURL_CFFI get -i safari https://example.com

# HTTP/3
CURL_CFFI get --http3 https://example.com
```

## Key flags

| Flag | Short | Description |
|------|-------|-------------|
| `--body` | `-b` | Print response body only |
| `--headers` | | Print response headers only |
| `--verbose` | `-v` | Print full request + response |
| `--impersonate` | `-i` | Browser to impersonate (default: `chrome`) |
| `--json` | `-j` | Serialize data as JSON (default) |
| `--form` | `-f` | Serialize data as form fields |
| `--proxy` | | Proxy URL |
| `--timeout` | | Timeout in seconds |
| `--follow` / `--no-follow` | | Follow/don't follow redirects (default: follow) |
| `--http3` | | Use HTTP/3 |

## Request item syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `Header:Value` | HTTP header | `Content-Type:application/json` |
| `Header:` | Remove header | `Accept:` |
| `param==value` | Query parameter | `page==2` |
| `field=value` | JSON/form string field | `name=John` |
| `field:=json` | JSON field (interpreted) | `age:=30` |
| `@filepath` | File upload | `@photo.jpg` |

## Batch execution

The `run` subcommand executes multiple requests from a file:

```bash
CURL_CFFI run requests.http
CURL_CFFI run session.har
CURL_CFFI run --no-session requests.http
```

Supported formats: `.http` / `.rest` (HTTP Request in Editor format) and
`.har` (HTTP Archive).

## Tips

- Always use `--body` (`-b`) when fetching content for parsing, to suppress
  headers and syntax highlighting.
- Use `-i safari` or `-i chrome` to impersonate specific browsers.
- Default timeout is generous; set `--timeout` for slow sites.
