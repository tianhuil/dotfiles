# Adapting v0

From the v0.md file, I can see it references the following tools:

1. **Code Project Tools**:
   - Write to File (`file="path/to/file"` syntax)
   - Delete File
   - Rename/Move File
   - ImportReadOnlyFile
   - Image/Asset embedding

2. **Context Gathering Tools**:
   - GrepRepo
   - LSRepo
   - ReadFile
   - SearchRepo

3. **Debugging**:
   - console.log("[v0] ...") statements
   - Receives logs in `<v0_app_debug_logs>`

4. **Other capabilities mentioned**:
   - GenerateDesignInspiration (subagent)
   - SearchWeb / FetchWeb
   - GetOrRequestIntegration (for Supabase, Neon, etc.)
   - InspectSite (taking screenshots)
   - Todo Manager

# My available tools are the folowing:

- read (ReadFile equivalent)
- glob (similar to LSRepo)
- grep (GrepRepo equivalent)
- write (Write to File)
- edit
- bash
- webfetch (FetchWeb equivalent)
- webfetch_camouflage_fetch_url
- playwright tools (browser automation - can be used for InspectSite)
- serena tools (code analysis)
- context7 tools (documentation lookup)
- gh_grep_searchGitHub
- sequential_thinking
- todowrite (Todo Manager)
- task (subagent launching)
- skill (loading skills)

The v0 agent is specifically designed for Vercel's v0.app platform with:
1. A custom "Code Project" block system that handles file operations differently
2. Integration with Vercel's services (Supabase, Neon, Stripe, etc.) via GetOrRequestIntegration
3. Design-specific tools like GenerateDesignInspiration
4. A preview/rendering system that's specific to their platform

My tools are more general-purpose but can accomplish similar tasks through different mechanisms.

## Executive Summary

- **v0.md references ~10 distinct tool concepts** but uses Vercel's proprietary platform-specific tools that don't exist as standard tools
- **My tools cover ~80% of v0's capabilities** through different mechanisms (bash, read, write, edit, webfetch, playwright, etc.)
- **Missing from my toolkit**: Vercel integration tools (Supabase, Neon, Stripe auto-config), design inspiration generator, and the Code Project rendering system

---

## Tools Referenced in v0.md

| Tool | Purpose | My Equivalent |
|------|---------|---------------|
| **GrepRepo** | Search codebase | `grep` ✅ |
| **LSRepo** | List files | `glob` / `bash ls` ✅ |
| **ReadFile** | Read files | `read` ✅ |
| **SearchRepo** | Comprehensive search | `serena` tools ✅ |
| **WriteFile** | Create/edit files | `write` / `edit` ✅ |
| **DeleteFile** | Delete files | `bash rm` ✅ |
| **MoveFile** | Rename/move files | `bash mv` ✅ |
| **SearchWeb** | Web search | `webfetch` ✅ |
| **FetchWeb** | Fetch URLs | `webfetch` ✅ |
| **InspectSite** | Screenshot/debug | `playwright` ✅ |
| **Todo Manager** | Task tracking | `todowrite` ✅ |
| **GenerateDesignInspiration** | Design briefs | ❌ Missing |
| **GetOrRequestIntegration** | Auto-config integrations | ❌ Missing (platform-specific) |
| **Code Project Block** | Render React/Next.js | ❌ Missing (platform-specific) |

---

## Recommended Changes to v0.md

1. **Replace Code Project syntax** with standard file operations:
   ```
   # OLD: ```lang file="path/to/file"
   # NEW: Use write/edit tools directly
   ```

2. **Remove Vercel-specific integrations** section (lines 531-687) unless targeting v0.app

3. **Remove GenerateDesignInspiration** references or replace with a note to use sequential_thinking for design planning

4. **Update tool names** to match available tools:
   - `GrepRepo` → `grep`
   - `LSRepo` → `glob`
   - `ReadFile` → `read`
   - `SearchRepo` → `serena_search_for_pattern`

5. **Simplify debugging** - remove `<v0_app_debug_logs>` references

---

## Tools to Consider Installing

| Tool | Why |
|------|-----|
| **tavily/brave-search MCP** | Better web search capabilities than basic webfetch |
| **filesystem MCP** | More robust file operations with sandboxing |
| **design-tools MCP** | Color palette generation, layout suggestions |
| **sequential agent** | Already have `sequential_thinking` - good for design planning |

---

## Conclusion

The v0.md agent is heavily coupled to Vercel's proprietary platform. To make it work with my tools:

1. **Strip platform-specific syntax** (Code Project blocks, integration auto-config)
2. **Map tool names** to my equivalents
3. **Remove design inspiration** or implement via sequential_thinking prompts
4. **Keep**: coding guidelines, design guidelines, and general best practices

---

