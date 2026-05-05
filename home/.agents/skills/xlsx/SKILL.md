---
name: xlsx
description: "Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an existing .xlsx, .xlsm, .csv, or .tsv file; create a new spreadsheet from scratch or from other data sources; or convert between tabular file formats. Also trigger for cleaning or restructuring messy tabular data files."
---

# XLSX creation, editing, and analysis

## Requirements for Outputs

### Professional Font
Use a consistent, professional font (e.g., Arial, Times New Roman) for all deliverables.

### Zero Formula Errors
Every Excel model MUST be delivered with ZERO formula errors (#REF!, #DIV/0!, #VALUE!, #N/A, #NAME?).

### Financial Models - Color Coding
- **Blue text (0,0,255)**: Hardcoded inputs
- **Black text (0,0,0)**: Formulas and calculations
- **Green text (0,128,0)**: Links from other worksheets
- **Red text (255,0,0)**: External links
- **Yellow background (255,255,0)**: Key assumptions

## CRITICAL: Use Formulas, Not Hardcoded Values

```python
# BAD: Calculating in Python and hardcoding
sheet['B10'] = total  # Hardcodes 5000

# GOOD: Let Excel calculate
sheet['B10'] = '=SUM(B2:B9)'
```

## Common Workflow

1. **Choose tool**: pandas for data, openpyxl for formulas/formatting
2. **Create/Load**: Create new workbook or load existing file
3. **Modify**: Add/edit data, formulas, and formatting
4. **Save**: Write to file
5. **Recalculate formulas (MANDATORY)**:
   ```bash
   python SKILL_DIR/scripts/recalc.py output.xlsx
   ```
6. **Verify and fix any errors** from recalc output

## Reading and Analyzing Data

```python
import pandas as pd

df = pd.read_excel('file.xlsx')
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)

df.head()
df.info()
df.describe()

df.to_excel('output.xlsx', index=False)
```

## Creating New Excel Files

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active

sheet['A1'] = 'Hello'
sheet['B1'] = 'World'
sheet.append(['Row', 'of', 'data'])

sheet['B2'] = '=SUM(A1:A10)'

sheet['A1'].font = Font(bold=True, color='FF0000')
sheet['A1'].fill = PatternFill('solid', start_color='FFFF00')
sheet['A1'].alignment = Alignment(horizontal='center')

sheet.column_dimensions['A'].width = 20

wb.save('output.xlsx')
```

## Editing Existing Excel Files

```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active

sheet['A1'] = 'New Value'
sheet.insert_rows(2)

new_sheet = wb.create_sheet('NewSheet')
new_sheet['A1'] = 'Data'

wb.save('modified.xlsx')
```

## Recalculating Formulas

```bash
python SKILL_DIR/scripts/recalc.py <excel_file> [timeout_seconds]
```

Returns JSON with error details:
```json
{
  "status": "success",
  "total_errors": 0,
  "total_formulas": 42,
  "error_summary": {}
}
```

## Formula Verification Checklist

- [ ] Test 2-3 sample references before building full model
- [ ] Confirm Excel columns match (column 64 = BL, not BK)
- [ ] Remember rows are 1-indexed
- [ ] Check for NaN values with `pd.notna()`
- [ ] Check for division by zero
- [ ] Verify cross-sheet references format (Sheet1!A1)

## Number Formatting Standards

- **Years**: Format as text strings ("2024" not "2,024")
- **Currency**: $#,##0; specify units in headers
- **Zeros**: Use "-" format ($#,##0;($#,##0);-)
- **Percentages**: 0.0% format
- **Negative numbers**: Use parentheses (123) not minus -123

## Code Style Guidelines

- Write minimal, concise Python code without unnecessary comments
- Avoid verbose variable names and redundant operations
- Add comments to cells with complex formulas
- Document data sources for hardcoded values

## Dependencies

- `pip install openpyxl pandas defusedxml lxml`
- LibreOffice for formula recalculation
