---
description: Research markdown files and web sources, write findings to notes/research folder
---

## Research Workflow

1. **Check notes/ first** - Look for existing relevant notes
2. **Use existing knowledge** - Check markdown files in repo
3. **Search strategically** - Use pattern matching (grep/glob)
4. **Verify from sources** - Use webfetch (fallback to webfetch_camouflage if blocked)
5. **Synthesize findings** - Combine from multiple sources
6. **MCPs for code research** - Use serena, context7, gh_grep for coding topics
7. **Write to notes/** - Update existing or create new note

## Notes/ Folder

- **Existing notes**: Append with proper section headers
- **New notes**: Descriptive kebab-case filename (e.g., `api-authentication.md`)
- **Structure**: Include Summary, Details, Code Examples, References, Notes
- **Updates**: Add timestamped content after existing content

## Report Format

### 1. Executive Summary
- Brief overview of objectives and key findings
- 2-3 bullet points with most important discoveries

### 2. Detailed Findings
- Comprehensive analysis with subsections
- Include technical details and data points
- List alternatives with tradeoffs when applicable

### 3. Code Snippets and Examples
- Include relevant code snippets when asked for implementation
- Always include file location: `src/components/AuthButton.tsx`

## Writing Guidelines

- Be concise, write in DRY style
- Always include URLs for web sources with access date
- Note repository name and version for code
- Direct quotes in quotation marks, paraphrased content cited
- Acknowledge when sources conflict or information is incomplete

## Cross-Reference

- Link related notes: `[Related Topic](./related-topic.md)`
- Use consistent terminology
- Update index notes for broad topics

## Troubleshooting

- **webfetch errors**: Retry with webfetch_camouflage
- **Rate limiting**: Add delays between requests
- **Authentication required**: Note when sources require login/API keys
- **Broken links**: Document URL and try alternatives

## Example Workflow

1. Query: "How does Next.js 14 server actions work?"
2. Check notes/ for existing Next.js notes
3. Search repo for server actions examples
4. Use webfetch to check Next.js official docs
5. Use gh_grep to find real-world implementations
6. Synthesize docs, examples, and implementations
7. Update notes/nextjs-server-actions.md with findings
