---
description: Create opencode skills following best practices
---

## Skill Locations

**User-wide** (in dotfiles repo):
```
./home/.opencode/skills/<skill-name>/SKILL.md
```
Installed to `~/.config/opencode/skills/<skill-name>/SKILL.md`

**Project-specific**:
```
./.opencode/skills/<skill-name>/SKILL.md
```

## Required Frontmatter

```yaml
---
name: skill-name
description: Clear description of what the skill does and when to use it
license: MIT
compatibility: opencode
metadata:
  audience: users
  workflow: general
---
```

## Name Validation

- 1-64 characters
- Lowercase alphanumeric with single hyphen separators
- Cannot start or end with `-`
- No consecutive `--`
- Must match directory name
- Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`

## Description Rules

- 1-1024 characters
- Write in third person
- Include both what the skill does and when to use it
- Be specific and include key terms

## Best Practices

### 1. Be Concise
Only include information Claude doesn't already have. Keep under 500 lines.

**Good** (50 tokens):
````markdown
## Extract PDF text
Use pdfplumber for text extraction:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
````
````

### 2. Use Progressive Disclosure
Split large content into separate files. Keep references one level deep from SKILL.md.

**Pattern**:
````markdown
# PDF Processing

## Quick start
Extract text with pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## Advanced features
**Form filling**: See [FORMS.md](FORMS.md)
**API reference**: See [REFERENCE.md](REFERENCE.md)
**Examples**: See [EXAMPLES.md](EXAMPLES.md)
````
````

### 3. Naming Conventions
Use gerund form (verb + -ing):
- `processing-pdfs`
- `analyzing-spreadsheets`
- `testing-code`

Avoid: vague names (`helper`, `utils`), generic terms (`documents`, `data`), reserved words (`anthropic-helper`)

### 4. Template Patterns

**For strict requirements**:
````markdown
## Report structure
ALWAYS use this exact template structure:
```markdown
# [Analysis Title]
## Executive summary
[One-paragraph overview]
## Key findings
- Finding 1 with data
## Recommendations
1. Specific action
```
````
````

**For flexible guidance**:
````markdown
## Report structure
Sensible default format, use judgment based on analysis:
```markdown
# [Analysis Title]
## Executive summary
[Overview]
## Key findings
[Adapt sections as needed]
## Recommendations
[Tailor to context]
```
````

### 5. Script Guidelines

**Solve, don't punt**: Handle errors explicitly
```python
def process_file(path):
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"File {path} not found, creating default")
        with open(path, "w") as f:
            f.write("")
        return ""
```

**Document constants**: Justify all values
```python
# HTTP requests complete within 30s; longer timeout for slow connections
REQUEST_TIMEOUT = 30
# Three retries balances reliability vs speed
MAX_RETRIES = 3
```

**No Windows-style paths**: Always use forward slashes
- ✓ `scripts/helper.py`
- ✗ `scripts\helper.py`

### 6. Time-sensitive Information
Use "old patterns" section for deprecated content:
```markdown
## Current method
Use v2 API: `api.example.com/v2/messages`

## Old patterns
<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>
The v1 API used: `api.example.com/v1/messages`
</details>
```

## Checklist for Effective Skills

### Core quality
- [ ] Description is specific with key terms and usage context
- [ ] SKILL.md under 500 lines
- [ ] Separate files for additional details
- [ ] No time-sensitive info (or in "old patterns" section)
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract
- [ ] File references one level deep
- [ ] Progressive disclosure used appropriately

### Code and scripts
- [ ] Scripts solve problems, don't punt to Claude
- [ ] Explicit and helpful error handling
- [ ] No "voodoo constants" (all values justified)
- [ ] Required packages listed
- [ ] Clear script documentation
- [ ] All forward slashes (no Windows paths)
- [ ] Validation/verification steps for critical operations

### Testing
- [ ] At least three evaluations created
- [ ] Tested with multiple models
- [ ] Tested with real usage scenarios

## Skill Discovery Paths

OpenCode searches these locations:
- Project: `.opencode/skills/<name>/SKILL.md`
- Global: `~/.config/opencode/skills/<name>/SKILL.md`
- Project Claude: `.claude/skills/<name>/SKILL.md` (don't write here!)
- Global Claude: `~/.claude/skills/<name>/SKILL.md` (don't write here!)
- Project agents: `.agents/skills/<name>/SKILL.md` (don't write here!)
- Global agents: `~/.agents/skills/<name>/SKILL.md` (don't write here!)

For project-local paths, OpenCode walks up from CWD to git worktree.
