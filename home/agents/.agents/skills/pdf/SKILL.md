---
name: pdf
description: Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, splitting PDFs apart, rotating pages, adding watermarks, creating new PDFs, filling PDF forms, encrypting/decrypting PDFs, extracting images, and OCR on scanned PDFs to make them searchable. If the user mentions a .pdf file or asks to produce one, use this skill.
---

# PDF Processing Guide

## Quick Start

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("document.pdf")
print(f"Pages: {len(reader.pages)}")

text = ""
for page in reader.pages:
    text += page.extract_text()
```

## Python Libraries

### pypdf - Basic Operations

#### Merge PDFs
```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as output:
    writer.write(output)
```

#### Split PDF
```python
reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as output:
        writer.write(output)
```

#### Extract Metadata
```python
reader = PdfReader("document.pdf")
meta = reader.metadata
print(f"Title: {meta.title}")
print(f"Author: {meta.author}")
```

#### Rotate Pages
```python
reader = PdfReader("input.pdf")
writer = PdfWriter()
page = reader.pages[0]
page.rotate(90)
writer.add_page(page)
with open("rotated.pdf", "wb") as output:
    writer.write(output)
```

### pdfplumber - Text and Table Extraction

#### Extract Text with Layout
```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
```

#### Extract Tables
```python
with pdfplumber.open("document.pdf") as pdf:
    for i, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for j, table in enumerate(tables):
            print(f"Table {j+1} on page {i+1}:")
            for row in table:
                print(row)
```

### reportlab - Create PDFs

#### Basic PDF Creation
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

c = canvas.Canvas("hello.pdf", pagesize=letter)
width, height = letter
c.drawString(100, height - 100, "Hello World!")
c.save()
```

#### Subscripts and Superscripts

**IMPORTANT**: Never use Unicode subscript/superscript characters. Use ReportLab's XML markup:
```python
from reportlab.platypus import Paragraph

chemical = Paragraph("H<sub>2</sub>O", styles['Normal'])
squared = Paragraph("x<super>2</super>", styles['Normal'])
```

## Command-Line Tools

### pdftotext (poppler-utils)
```bash
pdftotext input.pdf output.txt
pdftotext -layout input.pdf output.txt
pdftotext -f 1 -l 5 input.pdf output.txt
```

### qpdf
```bash
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf
qpdf input.pdf --pages . 1-5 -- pages1-5.pdf
qpdf input.pdf output.pdf --rotate=+90:1
qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf
```

## Common Tasks

### Extract Text from Scanned PDFs
```python
import pytesseract
from pdf2image import convert_from_path

images = convert_from_path('scanned.pdf')
text = ""
for i, image in enumerate(images):
    text += pytesseract.image_to_string(image)
```

### Add Watermark
```python
from pypdf import PdfReader, PdfWriter

watermark = PdfReader("watermark.pdf").pages[0]
reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)

with open("watermarked.pdf", "wb") as output:
    writer.write(output)
```

### Password Protection
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page)

writer.encrypt("userpassword", "ownerpassword")
with open("encrypted.pdf", "wb") as output:
    writer.write(output)
```

## Quick Reference

| Task | Best Tool | Command/Code |
|------|-----------|--------------|
| Merge PDFs | pypdf | `writer.add_page(page)` |
| Split PDFs | pypdf | One page per file |
| Extract text | pdfplumber | `page.extract_text()` |
| Extract tables | pdfplumber | `page.extract_tables()` |
| Create PDFs | reportlab | Canvas or Platypus |
| Command line merge | qpdf | `qpdf --empty --pages ...` |
| OCR scanned PDFs | pytesseract | Convert to image first |

## PDF Form Filling

**CRITICAL: Complete these steps in order.**

### Step 1: Check for fillable fields
```bash
python SKILL_DIR/scripts/check_fillable_fields.py <file.pdf>
```

### Step 2a: Fillable fields
```bash
python SKILL_DIR/scripts/extract_form_field_info.py <input.pdf> <field_info.json>
python SKILL_DIR/scripts/convert_pdf_to_images.py <file.pdf> <output_directory>
python SKILL_DIR/scripts/fill_fillable_fields.py <input pdf> <field_values.json> <output pdf>
```

### Step 2b: Non-fillable fields
```bash
python SKILL_DIR/scripts/extract_form_structure.py <input.pdf> form_structure.json
# Create fields.json with coordinates
python SKILL_DIR/scripts/check_bounding_boxes.py fields.json
python SKILL_DIR/scripts/fill_pdf_form_with_annotations.py <input.pdf> fields.json <output.pdf>
```

## Dependencies

- `pip install pypdf pdfplumber reportlab pdf2image pytesseract Pillow defusedxml`
- **poppler-utils**: `pdftotext`, `pdftoppm`
- **qpdf**: PDF manipulation
