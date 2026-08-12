---
name: oss-readme
description: Write compelling, complete READMEs for open-source projects. Use when the user says "add a README", "write a README", "create a readme", "update the README", "make a readme for this repo", "this project needs a readme", or asks for documentation landing pages for open-source repos, libraries, CLIs, or extensions.
---

# Open-Source README

Write a README that answers every visitor's first three questions — *what is this, do I want it, how do I get it* — in under ten seconds of scanning. Everything after that supports the reader who decided to stay.

## Structure

Follow this order. Every section earns its place; cut any that the project doesn't warrant.

```markdown
# Project Name

## Badges (one line)
## Short summary (1–2 sentences)
## Install
## How it works
## Architecture          (skip for tiny projects)
## Development          (skip if no build/test steps)
## License
```

### Project name

Use `# RepoName` — the GitHub repo slug, not a marketing name. Readers match it against their address bar.

### Badges

One line, right under the heading. Pick badges that answer real questions:

| Badge | When it earns its place |
|---|---|
| License (MIT, Apache, etc.) | Always — tells legal posture at a glance |
| Language / runtime version | Always — the first compatibility gate |
| Package manager / registry link | Libraries — gives the one-liner install |
| Build status (CI) | Has CI — signals maintained and green |
| Latest version / release | Published packages — reader checks if they're up to date |
| Platform | Platform-specific (Rust, C++, mobile) |

Skip badges that carry no information — "made with ❤️" badges, contributor count when the count is 1, maintenance status without CI to back it up. Use [shields.io](https://shields.io) for static badges; link to the right target (LICENSE file, registry page, CI workflow).

### Short summary

One to two sentences below the badges. State what the thing is, what problem it solves, and what ecosystem it lives in. Name-drop integrations the reader might recognise. Avoid aspirational language ("revolutionary", "blazing-fast") — let the project speak.

### Install

Concrete, copy-pasteable steps. Include prerequisites before commands. If there are multiple install paths (npm vs git clone vs brew), pick the one the target audience is most likely to use and put it first; defer alternatives to a collapsible or a sub-section.

- Name the minimum version of each prerequisite ("Node.js 18+"), not just the tool name.
- If setup requires a directory choice or config edit, show the exact path.
- End with how the reader confirms it worked (a command that prints a version, a reload step, etc.).

### How it works

The longer explanation — this is where readers decide to actually use the project. Cover:

- **The core mechanism.** What does the thing actually *do*? Walk through the runtime flow, not the code structure. A table of situation → behaviour works well for projects with several modes (like an extension that handles new vs resumed sessions differently).
- **Key design choices.** Why is it built this way? One sentence per choice — the reader who wants depth will read the code or the docs you link.
- **Edge cases.** What happens when the expected environment is missing? Degradation, not crash, is the story readers want.

Link to architecture docs, ADRs, or design notes here rather than restating them — the README is a map, not the territory.

### Architecture

For mid-size or larger projects. A file tree annotated with what each module does, plus links to design docs. Keep it to one tree — don't split by responsibility and again by technology. The reader is browsing, not studying.

### Development

How to work on the project: install dev dependencies, run tests, run the build. If there's a lint step, include it. If there's a contribution guide elsewhere, link to it — don't duplicate.

### License

One line: `[License name](LICENSE) © Year Name`. No long license text in the README.

## Principles

- **Lead with the badge line.** It's the most scannable signal — language, license, status in one visual sweep.
- **One repo fact, one place.** Don't state the license in both the badge and a prose section; the badge and the License heading cover it. Don't list dependencies in both Install and How It Works unless the contexts genuinely differ.
- **Concrete over descriptive.** "Run `pnpm install`" beats "install the dependencies." Show the command; skip the narrative.
- **Tables over prose for behavior.** When a project has several modes or input→output mappings, a table reads in one pass where paragraphs force re-reading.
- **No TODOs.** If a section isn't written yet, don't leave a placeholder — omit it. A section heading with nothing under it is noise.
- **Write for the newcomer, not the contributor.** The README's audience is someone arriving from a search result or a link, not someone who already knows the project.术语 and internal jargon ("ADR-0003", "the handler") belong in docs, not the README.
