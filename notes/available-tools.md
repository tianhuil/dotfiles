# Available Tools Summary

**Date:** 2025-02-15
**Topic:** Comprehensive overview of all available tools and their capabilities

## Executive Summary

- **Total Tools**: 80+ specialized tools organized across file operations, web research, browser automation, git operations, documentation, agent management, and semantic code analysis
- **Key Categories**: File I/O, Research & Documentation, Browser Automation, Git & Version Control, Agent Orchestration, Serena MCP (Semantic Code Analysis)
- **Primary Use Cases**: Research agents can gather information, interact with web pages, manage code, coordinate specialized sub-agents, and perform IDE-like semantic code retrieval and editing

## Detailed Findings

The following sections detail each tool category. Note that tools from different categories can often work together - for example, Serena's semantic code analysis tools can identify which files to read, and standard file tools can perform the actual reading and writing operations.

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

### 6. Serena MCP Server (Semantic Code Analysis)

**Overview**: Serena is a powerful coding agent toolkit that provides IDE-like semantic code retrieval and editing capabilities. It extracts code entities at the symbol level and exploits relational structure, making it highly efficient for navigating and manipulating complex codebases.

| Tool | Description |
|------|-------------|
| **Project & Workspace** |
| `activate_project` | Activates a project based on project name or path |
| `check_onboarding_performed` | Checks whether project onboarding was already performed |
| `onboarding` | Performs onboarding (identifies project structure, testing/build tasks) |
| `get_current_config` | Prints current configuration: active/available projects, tools, contexts, and modes |
| `open_dashboard` | Opens Serena web dashboard with logs, session info, and tool usage stats |
| `remove_project` | Removes a project from Serena configuration |
| `restart_language_server` | Restarts language server (needed when edits happen outside Serena) |
| `switch_modes` | Activates modes by providing a list of their names |
| **File Operations** |
| `create_text_file` | Creates/overwrites a file in the project directory |
| `read_file` | Reads a file within the project directory |
| `find_file` | Finds files in the given relative paths |
| `list_dir` | Lists files and directories (optionally with recursion) |
| `delete_lines` | Deletes a range of lines within a file |
| `insert_at_line` | Inserts content at a given line in a file |
| `replace_lines` | Replaces a range of lines with new content |
| `replace_content` | Replaces content in a file (optionally using regex) |
| `search_for_pattern` | Performs a search for a pattern in the project |
| **LSP-Based Symbol Operations** |
| `find_symbol` | Performs global (or local) symbol search using language server |
| `find_referencing_symbols` | Finds symbols that reference the given symbol using language server |
| `get_symbols_overview` | Gets overview of top-level symbols defined in a given file |
| `rename_symbol` | Renames a symbol throughout codebase using LSP refactoring |
| `replace_symbol_body` | Replaces the full definition of a symbol using language server |
| `insert_after_symbol` | Inserts content after the end of a symbol definition |
| `insert_before_symbol` | Inserts content before the beginning of a symbol definition |
| **JetBrains Backend Operations** (requires JetBrains plugin) |
| `jet_brains_find_symbol` | Global/local symbol search using JetBrains backend |
| `jet_brains_find_referencing_symbols` | Finds referencing symbols using JetBrains backend |
| `jet_brains_get_symbols_overview` | Retrieves top-level symbols overview using JetBrains backend |
| `jet_brains_type_hierarchy` | Retrieves type hierarchy (supertypes/subtypes) using JetBrains backend |
| **Memory Management** |
| `write_memory` | Writes a named memory to Serena's project-specific memory store |
| `read_memory` | Reads a memory from Serena's project-specific memory store |
| `list_memories` | Lists memories in Serena's project-specific memory store |
| `edit_memory` | Edits a memory in Serena's project-specific memory store |
| `delete_memory` | Deletes a memory from Serena's project-specific memory store |
| **Shell Command** |
| `execute_shell_command` | Executes a shell command |
| **Thinking & Planning Tools** |
| `think_about_collected_information` | Ponder completeness of collected information |
| `think_about_task_adherence` | Determine whether agent is still on track with task |
| `think_about_whether_you_are_done` | Determine whether the task is truly completed |
| **Conversation Management** |
| `initial_instructions` | Provides instructions on using Serena toolbox (when system prompt not read automatically) |
| `prepare_for_new_conversation` | Instructions for preparing for new conversation with necessary context |
| `summarize_changes` | Instructions for summarizing changes made to the codebase |

**Notes**:
- Serena provides semantic code understanding (30+ languages via LSP, all languages via JetBrains plugin)
- Uses symbol-level extraction rather than full file reads → much more token-efficient
- JetBrains backend offers most robust experience, supports all JetBrains IDE languages/frameworks
- Most configurations only enable a subset of tools simultaneously (configurable)
- Onboarding analyzes project structure to identify build/test workflows
- Memory store enables persistent knowledge across conversations
- LSP backend: AL, Bash, C#, C/C++, Clojure, Dart, Elixir, Elm, Erlang, Fortran, Go, Groovy (partial), Haskell, Java, JavaScript, Julia, Kotlin, Lua, Markdown, MATLAB, Nix, Perl, PHP, PowerShell, Python, R, Ruby, Rust, Scala, Swift, TOML, TypeScript, YAML, Zig (30+ languages)
- JetBrains backend: All languages/frameworks supported by JetBrains IDEs (IntelliJ IDEA, PyCharm, WebStorm, PhpStorm, RubyMine, GoLand, CLion, Android Studio, etc.) - Rider excluded

**Key Capabilities**:
- **Semantic Navigation**: Find symbols, references, and type hierarchies without reading entire files
- **Precise Editing**: Insert/replace at symbol boundaries (before/after symbol definitions)
- **Refactoring**: Rename symbols across entire codebase with LSP precision
- **Context Awareness**: Understand code relationships through symbol references and hierarchies
- **Workflow Automation**: Onboarding discovers project structure and essential tasks

**When to Use Serena**:
- Navigating large, complex codebases
- Finding specific symbols and their references
- Performing precise, symbol-level edits
- Refactoring code (rename symbols, replace symbol bodies)
- Tasks requiring understanding of code relationships (references, hierarchies)
- Projects with strong structure where semantic understanding saves tokens

**When Serena Adds Less Value**:
- Writing code from scratch (no existing structure)
- Tasks involving only 1-2 small files
- Simple file-level edits without semantic context

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

### Serena Semantic Code Navigation
```python
# Find a symbol globally (e.g., function, class, variable)
find_symbol(symbol_name="UserProfile")

# Find all symbols that reference a specific symbol
find_referencing_symbols(symbol_name="UserProfile")

# Get overview of top-level symbols in a file
get_symbols_overview(file_path="src/components/UserProfile.tsx")

# Rename a symbol across the entire codebase
rename_symbol(old_name="UserProfile", new_name="UserCard")
```

### Serena Precise Editing
```python
# Insert a new method after a symbol definition
insert_after_symbol(
  symbol_name="UserProfile",
  content="\n  // New method\n  getDisplayName() { ... }"
)

# Replace the entire body of a symbol
replace_symbol_body(
  symbol_name="UserProfile",
  new_body="{ return this.user.name; }"
)

# Insert before symbol definition
insert_before_symbol(
  symbol_name="UserProfile",
  content="// @ts-nocheck\n"
)
```

### Serena Memory Management
```python
# Store project context for future reference
write_memory(
  name="project-architecture",
  content="The app follows a three-tier architecture with services, controllers, and models"
)

# Retrieve stored context
read_memory(name="project-architecture")

# List all available memories
list_memories()
```

## Notes

### Best Practices

1. **Parallel Execution**: Always prefer parallel tool calls when operations are independent
2. **Quote File Paths**: Always quote paths with spaces in bash commands
3. **Large Codebases**: Use Serena for semantic navigation in large/complex projects; it's more token-efficient than reading entire files
4. **Use Right Tool for Job**:
   - File search: `glob` (not find/ls)
   - Content search: `grep` (not grep/rg)
   - Read files: `read` (not cat/head/tail)
   - Edit files: `edit` (not sed/awk)
   - Write files: `write` (not echo/cat)
    - **Semantic code search/edit**: Use Serena (`find_symbol`, `replace_symbol_body`, etc.) for code-specific operations
    - **Standard file operations**: Use standard tools (`read`, `edit`, `grep`) for non-code files or simple edits

5. **Error Handling**:
   - If webfetch fails, retry with webfetch_camouflage
   - Context7/gh_grep: max 3 calls per question
   - Git operations: follow safety protocols strictly
   - Serena LSP: Use `restart_language_server` if edits made outside Serena cause issues

6. **Research Workflow**:
   1. Check notes/ for existing research
   2. Search repo for relevant code (use `find_file` or `glob` for structure, `grep` for content)
   3. For code-specific research in large codebases: Use Serena's `find_symbol`, `find_referencing_symbols`
   4. Use webfetch for up-to-date info (fallback to camouflage)
   5. Use gh_grep for real-world examples
    6. Synthesize and write to notes/

7. **Task Management**:
   - Use todo list for 3+ step tasks
   - Mark tasks in_progress when starting
   - Mark completed immediately (don't batch)
   - Only ONE in_progress at a time
   - Complete existing tasks before starting new ones

8. **Serena vs Standard Tools**:
   - Use **Serena** (`find_symbol`, `find_referencing_symbols`, `get_symbols_overview`) for: navigating large codebases, finding specific functions/classes, understanding code relationships
   - Use **Standard tools** (`read`, `grep`, `glob`) for: simple file reads, small projects, searching text content, finding files by pattern
   - Use **Serena editing** (`insert_after_symbol`, `replace_symbol_body`, `rename_symbol`) for: precise symbol-level edits, refactoring
   - Use **Standard editing** (`edit`, `write`) for: general text replacements, creating new files, simple line edits
   - Use **Serena memory** (`write_memory`, `read_memory`) for: storing project context, architecture notes, workflow patterns across conversations

### Tool Limitations

- **bash**: For terminal operations only, NOT file operations
- **edit**: Must call read first; requires unique oldString
- **webfetch**: May be blocked by anti-bot detection → use webfetch_camouflage
- **Context7**: Need library ID before querying (unless provided)
- **gh_grep**: Searches literal code, not keywords
- **Task**: Not for simple file reads or class definitions
- **Playwright**: 2-minute timeout by default for navigate
- **Serena LSP tools**: May require `restart_language_server` after external code edits
- **Serena**: Adds less value for very small projects or code written from scratch
- **Serena JetBrains tools**: Require JetBrains plugin installation and running JetBrains IDE

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
- Serena: https://github.com/oraios/serena
- Serena Documentation: https://oraios.github.io/serena

## Updates

### 2025-02-15 (Second Update)
- Added Serena MCP Server tools (37 tools for semantic code analysis)
- Organized Serena tools into 7 subcategories: Project/Workspace, File Operations, LSP Symbol Ops, JetBrains Backend, Memory Management, Shell, Thinking Tools
- Documented Serena's support for 30+ languages via LSP and all JetBrains IDE languages via plugin
- Added Serena code examples for symbol navigation, precise editing, and memory management
- Updated total tool count from 45+ to 80+

### 2025-02-15 (Initial)
- Initial comprehensive tool catalog created
- Organized 45+ tools into 5 main categories
- Added best practices and workflow patterns
- Documented git safety protocols and commit/PR creation procedures
