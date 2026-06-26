---
name: pptx
description: "Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx file; editing, modifying, or updating existing presentations; combining or splitting slide files; working with templates, layouts, speaker notes, or comments. Trigger whenever the user mentions \"deck\", \"slides\", \"presentation\", or references a .pptx filename."
---

# PPTX Skill

## Quick Reference

| Task | Guide |
|------|-------|
| Read/analyze content | `python -m markitdown presentation.pptx` |
| Edit or create from template | See Editing Workflow below |
| Create from scratch | See Creating from Scratch below |

### Reading Content

```bash
python -m markitdown presentation.pptx
python SKILL_DIR/scripts/thumbnail.py presentation.pptx
python SKILL_DIR/scripts/office/unpack.py presentation.pptx unpacked/
```

---

## Editing Workflow

1. **Analyze template**:
   ```bash
   python SKILL_DIR/scripts/thumbnail.py template.pptx
   python -m markitdown template.pptx
   ```

2. **Plan slide mapping**: Choose varied layouts (2-column, image + text, full-bleed, quote slides, stat callouts, icon grids).

3. **Unpack**: `python SKILL_DIR/scripts/office/unpack.py template.pptx unpacked/`

4. **Build presentation**:
   - Delete unwanted slides (remove from `<p:sldIdLst>`)
   - Duplicate slides: `python SKILL_DIR/scripts/add_slide.py unpacked/ slide2.xml`
   - Reorder slides in `<p:sldIdLst>`

5. **Edit content**: Update text in each `slide{N}.xml`. Use the Edit tool.

6. **Clean**: `python SKILL_DIR/scripts/clean.py unpacked/`

7. **Pack**: `python SKILL_DIR/scripts/office/pack.py unpacked/ output.pptx --original template.pptx`

---

## Creating from Scratch

Use PptxGenJS. Install: `npm install -g pptxgenjs`

### Setup
```javascript
const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Your Name';

let slide = pres.addSlide();
slide.addText("Hello World!", { x: 0.5, y: 0.5, fontSize: 36, color: "363636" });

pres.writeFile({ fileName: "Presentation.pptx" });
```

### Layout Dimensions

- `LAYOUT_16x9`: 10" x 5.625" (default)
- `LAYOUT_16x10`: 10" x 6.25"
- `LAYOUT_4x3`: 10" x 7.5"

### Text & Formatting
```javascript
slide.addText([
  { text: "Bold ", options: { bold: true } },
  { text: "Italic ", options: { italic: true } }
], { x: 1, y: 3, w: 8, h: 1 });

slide.addText([
  { text: "Line 1", options: { breakLine: true } },
  { text: "Line 2" }
], { x: 0.5, y: 0.5, w: 8, h: 2 });
```

### Lists & Bullets
```javascript
slide.addText([
  { text: "First item", options: { bullet: true, breakLine: true } },
  { text: "Second item", options: { bullet: true } }
], { x: 0.5, y: 0.5, w: 8, h: 3 });
```

### Shapes
```javascript
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 0.8, w: 1.5, h: 3.0,
  fill: { color: "FF0000" }, line: { color: "000000", width: 2 }
});

slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" }, rectRadius: 0.1,
  shadow: { type: "outer", color: "000000", blur: 6, offset: 2, opacity: 0.15 }
});
```

### Images
```javascript
slide.addImage({ path: "images/chart.png", x: 1, y: 1, w: 5, h: 3 });
slide.addImage({ data: "image/png;base64,iVBORw0KGgo...", x: 1, y: 1, w: 5, h: 3 });
```

### Tables
```javascript
slide.addTable([
  ["Header 1", "Header 2"],
  ["Cell 1", "Cell 2"]
], {
  x: 1, y: 1, w: 8, h: 2,
  border: { pt: 1, color: "999999" }, fill: { color: "F1F1F1" }
});
```

### Charts
```javascript
slide.addChart(pres.charts.BAR, [{
  name: "Sales", labels: ["Q1", "Q2", "Q3", "Q4"], values: [4500, 5500, 6200, 7100]
}], { x: 0.5, y: 0.6, w: 6, h: 3, barDir: 'col' });
```

### Backgrounds
```javascript
slide.background = { color: "F1F1F1" };
slide.background = { path: "https://example.com/bg.jpg" };
```

### Icons (using react-icons)
```javascript
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaCheckCircle } = require("react-icons/fa");

function iconToBase64Png(IconComponent, color = "#000000", size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}
```

### Common Pitfalls

1. **NEVER use "#" with hex colors** - causes file corruption
2. **NEVER encode opacity in hex** - use `opacity` property
3. **Use `bullet: true`** - NEVER unicode "•"
4. **Use `breakLine: true`** between array items
5. **NEVER reuse option objects** - PptxGenJS mutates in-place
6. **Each presentation needs fresh `pptxgen()` instance**

---

## Design Guidelines

### Color Palettes

| Theme | Primary | Secondary | Accent |
|-------|---------|-----------|--------|
| **Midnight Executive** | `1E2761` | `CADCFC` | `FFFFFF` |
| **Forest & Moss** | `2C5F2D` | `97BC62` | `F5F5F5` |
| **Coral Energy** | `F96167` | `F9E795` | `2F3C7E` |
| **Charcoal Minimal** | `36454F` | `F2F2F2` | `212121` |
| **Teal Trust** | `028090` | `00A896` | `02C39A` |
| **Berry & Cream** | `6D2E46` | `A26769` | `ECE2D0` |

### Typography

| Element | Size |
|---------|------|
| Slide title | 36-44pt bold |
| Section header | 20-24pt bold |
| Body text | 14-16pt |
| Captions | 10-12pt muted |

### Avoid

- Repeating the same layout
- Centering body text (left-align)
- Defaulting to blue
- Text-only slides
- Accent lines under titles

---

## QA (Required)

### Content QA
```bash
python -m markitdown output.pptx
python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum"
```

### Visual QA

Convert to images for inspection:
```bash
python SKILL_DIR/scripts/office/soffice.py --headless --convert-to pdf output.pptx
pdftoppm -jpeg -r 150 output.pdf slide
```

Check for overlapping elements, text overflow, low contrast, leftover placeholders.

---

## Dependencies

- `pip install "markitdown[pptx]" Pillow defusedxml lxml`
- `npm install -g pptxgenjs`
- LibreOffice (`soffice`) for PDF conversion
- Poppler (`pdftoppm`) for images
