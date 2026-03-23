---
name: search-corporate-logo
description: Search and download SVG logos from SVGL.app for corporate branding. Use when you need to find, download, or integrate company logos in projects.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: design
---

# Corporate Logo Search and Processing with SVGL.app

Search and download SVG logos from SVGL.app's comprehensive logo library, then convert and process them for project use.

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

---

## Logo Processing Pipeline

### Step 0: Convert to PNG

**Always convert SVG/EPS/PDF to PNG first** to get enough pixels before resizing:

```bash
# SVG/EPS/PDF - use density for sufficient resolution
convert input.svg -density 300 -background none logo.png

# For complex SVGs, rsvg-convert handles better
rsvg-convert -w 600 input.svg -o logo.png

# Raster inputs (JPG, WEBP, GIF)
convert input.jpg logo.png
convert input.webp logo.png
convert input.gif[0] logo.png   # [0] takes first frame if animated
```

### Full Processing Pipeline

```bash
# Step 0: Convert to PNG
convert input.svg -density 300 -background none logo_raw.png

# Steps 1-N: Process
convert logo_raw.png \
  -fuzz 15% -transparent white \
  -trim +repage \
  -gravity center -background none -extent 200x80 \
  -brightness-contrast 0x25 \
  -modulate 100,150,100 \
  -colorspace Gray \
  -normalize \
  -brightness-contrast 5x30 \
  logo_gray.png
```

### Decision Tree

```
0. What is the input format?
   SVG/EPS/PDF → convert with -density 300 -background none
   JPG/WEBP    → convert directly to PNG
   GIF         → convert input.gif[0] to PNG (first frame only)
   PNG         → skip Step 0, proceed directly
   
1. Run identify → check min/max
2. min > 50 after grayscale?  → apply -level 10%,90%
3. Logo is outline/thin lines? → skip -modulate, increase -sharpen to 0x1.5
4. Logo looks inverted (dark bg)? → add -negate before -level
5. Logo still muddy at small size? → -sharpen 0x1.0 as final step
6. Background not fully removed? → increase -fuzz to 25% or try -transparent "#f0f0f0"
```

**Note**: SVGs may have built-in canvas padding, so `-trim` may still be needed after PNG conversion.

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
