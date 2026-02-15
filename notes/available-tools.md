# Available Tools Summary

**Date:** 2025-02-15
**Topic:** Comprehensive overview of all available tools and their capabilities

## Executive Summary

- **Total Tools**: 45+ specialized tools organized across file operations, web research, browser automation, git operations, documentation, and agent management
- **Key Categories**: File I/O, Research & Documentation, Browser Automation, Git & Version Control, Agent Orchestration
- **Primary Use Cases**: Research agents can gather information, interact with web pages, manage code, and coordinate specialized sub-agents

## Detailed Findings

### 1. File Operations

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `bash` | Execute bash commands with persistent shell session | command, workdir, timeout |
| `read` | Read files or directories (up to 2000 lines) | filePath, offset, limit |
| `write` | Write content to files (overwrites existing) | content, filePath |
| `edit` | Exact string replacement in files | filePath, oldString, newString, replaceAll |
| `glob` | Fast file pattern matching | pattern, path |
| `grep` | Fast content search with regex | pattern, path, include |

**Notes**:
- Always quote file paths with spaces in bash commands
- Read tool must be called before Edit or Write on existing files
- Edit requires unique oldString or use replaceAll flag
- Grep for counting matches: use bash with `rg` directly

### 2. Web Research & Documentation

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `webfetch` | Fetch web content (converts to Markdown) | url, format, timeout |
| `webfetch_camouflage_fetch_url` | Fetch with browser fingerprinting (anti-bot bypass) | url, impersonate, timeout, max_chars |
| `context7_resolve-library-id` | Resolve package name to Context7 library ID | query, libraryName |
| `context7_query-docs` | Query library documentation via Context7 | libraryId, query |
| `gh_grep_searchGitHub` | Search GitHub for real code patterns | query, language, repo, path, useRegexp |

**Notes**:
- If `webfetch` fails (403, blocked), retry with `webfetch_camouflage`
- Context7 requires resolve-library-id before query-docs unless library ID provided explicitly
- gh_grep searches literal code patterns, not keywords
- Max 3 calls per question for Context7 and gh_grep

### 3. Playwright Browser Automation

| Tool | Description |
|------|-------------|
| `playwright_start_codegen_session` | Start recording Playwright actions |
| `playwright_end_codegen_session` | Generate test file from session |
| `playwright_get_codegen_session` | Get session info |
| `playwright_clear_codegen_session` | Clear session without generating |
| `playwright_playwright_navigate` | Navigate to URL |
| `playwright_playwright_screenshot` | Take screenshot of page or element |
| `playwright_playwright_click` | Click element |
| `playwright_playwright_iframe_click` | Click element in iframe |
| `playwright_playwright_fill` | Fill input field |
| `playwright_playwright_iframe_fill` | Fill input in iframe |
| `playwright_playwright_select` | Select from dropdown |
| `playwright_playwright_hover` | Hover over element |
| `playwright_playwright_upload_file` | Upload file |
| `playwright_playwright_evaluate` | Execute JavaScript |
| `playwright_playwright_console_logs` | Retrieve browser console logs |
| `playwright_playwright_resize` | Resize viewport (supports 143+ device presets) |
| `playwright_playwright_close` | Close browser |
| `playwright_playwright_get` | HTTP GET request |
| `playwright_playwright_post` | HTTP POST request |
| `playwright_playwright_put` | HTTP PUT request |
| `playwright_playwright_patch` | HTTP PATCH request |
| `playwright_playwright_delete` | HTTP DELETE request |
| `playwright_playwright_expect_response` | Start waiting for HTTP response |
| `playwright_playwright_assert_response` | Assert expected HTTP response |
| `playwright_playwright_custom_user_agent` | Set custom User-Agent |
| `playwright_playwright_get_visible_text` | Get visible page text |
| `playwright_playwright_get_visible_html` | Get HTML with cleaning options |
| `playwright_playwright_go_back` | Navigate back |
| `playwright_playwright_go_forward` | Navigate forward |
| `playwright_playwright_drag` | Drag element to target |
| `playwright_playwright_press_key` | Press keyboard key |
| `playwright_playwright_save_as_pdf` | Save page as PDF |
| `playwright_playwright_click_and_switch_tab` | Click link and switch to new tab |

**Notes**:
- Default browser: chromium (supports firefox, webkit)
- Default viewport: 1280x720
- Device presets: iPhone 13, iPad Pro 11, Pixel 7, Galaxy S24, Desktop Chrome, etc.
- For dynamic content or JavaScript-heavy sites, prefer Playwright over webfetch

### 4. Git & Version Control

| Tool | Description |
|------|-------------|
| **Via Bash** | git status, git diff, git log, git add, git commit, git push, gh CLI commands |

**Git Safety Protocol**:
- NEVER update git config
- NO force pushes or hard resets unless explicitly requested
- NO skipping hooks (--no-verify) unless requested
- NO force push to main/master
- git commit --amend only if: user requested OR hook auto-modified AND HEAD created by you AND not pushed
- If commit fails/rejected by hook: fix issue, create NEW commit (never amend)
- If already pushed: NEVER amend unless user explicitly requests

**Creating Commits**:
1. Run git status, git diff, git log in parallel
2. Analyze changes and draft commit message
3. Add files, commit with message, run git status after
4. Only commit when user explicitly asks

**Creating Pull Requests**:
1. Run git status, git diff, check remote sync, git log, git diff [base-branch]...HEAD
2. Analyze ALL commits in branch
3. Create branch if needed, push with -u, create PR via gh pr create
4. Return PR URL

### 5. Agent Orchestration & Skills

| Tool | Description | Available Subagents |
|------|-------------|---------------------|
| `task` | Launch specialized sub-agents | general, explore, ts-node-validation, writing-skills, research, v0, git, py-validation |
| `skill` | Load domain-specific skill instructions | git-commit, dotfiles-setup, typecheck-lint, github-pr, merge-conflict, search-corporate-logo, ts-coding-skill, zod-ts, coding-standards, resolve-git-merge-conflict |
| `todowrite` | Create and manage task lists | - |
| `sequential_thinking_sequentialthinking` | Reflective problem-solving through structured thoughts | - |

**Available Subagents**:
- **general**: Multi-step parallel tasks, research, coding
- **explore**: Fast codebase exploration (quick/medium/very thorough)
- **ts-node-validation**: TypeScript Node.js style guide
- **writing-skills**: Create opencode skills
- **research**: Work with notes/ folder and markdown files
- **v0**: Manual subagent invocation only
- **git**: Git operations without asking
- **py-validation**: Python style guide

**Available Skills** (auto-loaded when needed):
- `git-commit`: Generate commit messages from staged changes
- `dotfiles-setup`: Manage dotfiles repo structure
- `typecheck-lint`: Run type checking and linting
- `github-pr`: Create/manage PRs with gh CLI
- `merge-conflict`: Resolve merge conflicts safely
- `search-corporate-logo`: Search/download SVG logos from SVGL.app
- `ts-coding-skill`: TypeScript Node.js style guide
- `zod-ts`: Zod runtime validation error handling
- `coding-standards`: Coding best practices
- `resolve-git-merge-conflict`: Keep code from both branches

**When to Use Task Tool**:
- Executing custom slash commands
- When agent description matches task (e.g., use code-reviewer after writing significant code)
- DO NOT use for: reading specific file paths, searching specific class names, searching within 2-3 files

**When to Use Todo List**:
- Complex multistep tasks (3+ steps)
- Non-trivial, complex tasks
- User explicitly requests todo list
- User provides multiple tasks
- After receiving new instructions
- After completing a task (mark complete, add follow-ups)
- Starting new task (mark in_progress, only ONE in_progress at a time)

**When NOT to Use Todo List**:
- Single, straightforward task
- Trivial task (<3 steps)
- Purely conversational or informational task

## Code Snippets and Examples

### Parallel Tool Usage Pattern
```bash
# When multiple independent operations are needed
git status
git diff
git log
```

### Sequential Tool Usage Pattern
```bash
# When operations depend on each other
mkdir foo && cd foo && touch bar.txt
```

### Web Research with Fallback
```python
# First try webfetch
webfetch(url="https://example.com", format="markdown")

# If that fails, use webfetch_camouflage
webfetch_camouflage_fetch_url(url="https://example.com", impersonate="chrome136")
```

### Context7 Query Pattern
```python
# 1. Resolve library ID first
context7_resolve-library-id(
  query="How to set up JWT authentication",
  libraryName="express"
)

# 2. Query documentation with resolved ID
context7_query-docs(
  libraryId="/expressjs/express",
  query="How to set up JWT authentication in Express.js"
)
```

### GitHub Code Search
```python
# Search for literal code patterns
gh_grep_searchGitHub(
  query="useState(",
  language=["TypeScript", "TSX"],
  repo="facebook/react"
)

# Use regex for flexible patterns
gh_grep_searchGitHub(
  query="(?s)useState\\(.*loading",
  useRegexp=True
)
```

## Notes

### Best Practices

1. **Parallel Execution**: Always prefer parallel tool calls when operations are independent
2. **Quote File Paths**: Always quote paths with spaces in bash commands
3. **Use Right Tool for Job**:
   - File search: `glob` (not find/ls)
   - Content search: `grep` (not grep/rg)
   - Read files: `read` (not cat/head/tail)
   - Edit files: `edit` (not sed/awk)
   - Write files: `write` (not echo/cat)

2. **Error Handling**:
   - If webfetch fails, retry with webfetch_camouflage
   - Context7/gh_grep: max 3 calls per question
   - Git operations: follow safety protocols strictly

3. **Research Workflow**:
   1. Check notes/ for existing research
   2. Search repo for relevant code
   3. Use webfetch for up-to-date info (fallback to camouflage)
   4. Use gh_grep for real-world examples
   5. Synthesize and write to notes/

4. **Task Management**:
   - Use todo list for 3+ step tasks
   - Mark tasks in_progress when starting
   - Mark completed immediately (don't batch)
   - Only ONE in_progress at a time
   - Complete existing tasks before starting new ones

### Tool Limitations

- **bash**: For terminal operations only, NOT file operations
- **edit**: Must call read first; requires unique oldString
- **webfetch**: May be blocked by anti-bot detection → use webfetch_camouflage
- **Context7**: Need library ID before querying (unless provided)
- **gh_grep**: Searches literal code, not keywords
- **Task**: Not for simple file reads or class definitions
- **Playwright**: 2-minute timeout by default for navigate

### Environment Information

- **Working Directory**: `/Volumes/Workspace/dotfiles`
- **Is Git Repo**: Yes
- **Platform**: darwin (macOS)
- **Current Date**: 2025-02-15

## References

- OpenCode Agent documentation: `/Volumes/Workspace/dotfiles/AGENTS.md`
- Dotfiles architecture: Perfect mapping structure (`home/` → `~/`)
- Skills location: `home/.opencode/skills/<name>/SKILL.md` → `~/.config/opencode/skills/`
- XDG Base Directory Specification followed for `.local/` binaries

## Updates

### 2025-02-15
- Initial comprehensive tool catalog created
- Organized 45+ tools into 5 main categories
- Added best practices and workflow patterns
- Documented git safety protocols and commit/PR creation procedures
