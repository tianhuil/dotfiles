---
name: search-corporate-logo
description: Search and download SVG logos from SVGL.app for corporate branding. Use when you need to find, download, or integrate company logos in projects.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: design
---

# Corporate Logo Search with SVGL.app

Search and download SVG logos from SVGL.app's comprehensive logo library.

## Quick Start

### Search for a logo

```bash
curl "https://api.svgl.app?search=openai"
```

### Download a logo

```bash
# Light mode
curl -s "https://svgl.app/library/openai.svg" > openai-light.svg

# Dark mode
curl -s "https://svgl.app/library/openai_dark.svg" > openai-dark.svg
```

## API Search Response

```json
[
  {
    "id": 259,
    "title": "OpenAI",
    "category": "AI",
    "route": {
      "light": "https://svgl.app/library/openai.svg",
      "dark": "https://svgl.app/library/openai_dark.svg"
    },
    "wordmark": {
      "light": "https://svgl.app/library/openai_wordmark_light.svg",
      "dark": "https://svgl.app/library/openai_wordmark_dark.svg"
    },
    "url": "https://openai.com/",
    "brandUrl": "https://openai.com/brand/"
  }
]
```

## Logo Variants

### Theme-specific logos

Many logos include light and dark variants:

```javascript
"route": {
  "light": "https://svgl.app/library/openai.svg",
  "dark": "https://svgl.app/library/openai_dark.svg"
}
```

### Wordmarks

Text-only versions of logos:

```javascript
"wordmark": {
  "light": "https://svgl.app/library/openai_wordmark_light.svg",
  "dark": "https://svgl.app/library/openai_wordmark_dark.svg"
}
```

### Single variant

Some logos only have one version:

```javascript
"route": "https://svgl.app/library/gemini.svg"
```

## Getting SVG Code

Retrieve optimized SVG code directly:

```bash
# Optimized (default)
curl "https://api.svgl.app/svg/openai.svg"

# Non-optimized
curl "https://api.svgl.app/svg/openai.svg?no-optimize"
```

## Resources

- **SVGL.app**: https://svgl.app
- **API Docs**: https://svgl.app/docs/api
- **GitHub Repository**: https://github.com/pheralb/svgl
- **Categories**: See full list in repository

## Notes

- API is open and doesn't require authentication
- Rate limiting may apply for excessive requests
- All logos are optimized for web use (21kb max size)
- Respect brand guidelines when available (check `brandUrl` field)
