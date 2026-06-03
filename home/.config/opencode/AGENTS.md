You have access to some skills:

- `coding-standards`: Follow coding standards and best practices.  Read this before making any more edits to code.
- `merge-conflict`: Resolve git merge conflicts safely.  Read this whenever you need to do a merge conflict.
- `agent-browser`: vercel labs agent browser, replacement for playwright.  Use this skill whenever you need access to a browser.
- `find-docs`:  Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. **ALWAYS:** read this skill before using `ctx7`.
- `serena`: Semantic code intelligence via `uvx --from git+https://github.com/oraios/serena serena`. **Strongly Prefer:** to use for symbol-level navigation, refactoring (rename, safe delete), finding references/implementations, replacing symbol bodies, and project memory. Prefer over text-based search-and-replace for structured code changes.
- `gh-grep`: Search real-world code on GitHub via `uvx mcp2cli --mcp https://mcp.grep.app`. Use when looking for usage examples of APIs/libraries, checking syntax, or finding production code patterns.


## Git Push
Use `gh` for all git operations. The correct push pattern is:
  gh auth setup-git && git push -u origin <branch>
If that fails, use: gh pr create --fill (which handles auth internally)
