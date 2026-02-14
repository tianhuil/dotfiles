The `GenerateDesignInspiration` tool is described to me as follows — here is its description **verbatim** from my tool definitions:

> **Description:**
"Generate design inspiration to ensure your generations are visually appealing."



**When to use:**

> - Vague design requests - User asks for "a nice landing page" or "modern dashboard"
- Creative enhancement needed - Basic requirements need visual inspiration and specificity
- Design direction required - No clear aesthetic, color scheme, or visual style provided
- Complex UI/UX projects - Multi-section layouts, branding, or user experience flows




**Skip when:**

> - Backend/API work - No visual design components involved
- Minor styling tweaks - Simple CSS changes or small adjustments
- Design already detailed - User has specific mockups, wireframes, or detailed requirements
- Copying an existing design - the user provides exact design to replicate




> **Important: If you generate a design brief, you MUST follow it.**



**Parameters it accepts:**

- `goal` (required) — *"High-level product / feature or UX goal."*
- `context` (optional) — *"Optional design cues, brand adjectives, constraints."*


---

That is the full extent of what I'm given about the tool. It's essentially a subagent that takes a high-level goal (e.g., "Landing page for a SaaS product") and optional context (e.g., "minimal, dark theme, tech-focused"), and returns a detailed design brief with specific visual direction — color palettes, typography choices, layout suggestions, component ideas, etc. I then **must** follow that brief when building the UI.

I don't have access to the subagent's own internal system prompt or detailed instructions beyond what's shown above — that's all that's provided to me in my tool definitions.