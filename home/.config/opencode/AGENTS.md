You have access to some skills:

- `coding-standards`: Follow coding standards and best practices.  Read this before making any more edits to code.
- `merge-conflict`: Resolve git merge conflicts safely.  Read this whenever you need to do a merge conflict.
- `agent-browser`: vercel labs agent browser, replacement for playwright.  Use this skill whenever you need access to a browser.
- `find-docs`:  Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs. Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.
- `serena`: Semantic code intelligence via `uvx --from git+https://github.com/oraios/serena serena`. **Strongly Prefer:** to use for symbol-level navigation, refactoring (rename, safe delete), finding references/implementations, replacing symbol bodies, and project memory. Prefer over text-based search-and-replace for structured code changes.
- `gh-grep`: Search real-world code on GitHub via `uvx mcp2cli --mcp https://mcp.grep.app`. Use when looking for usage examples of APIs/libraries, checking syntax, or finding production code patterns.
