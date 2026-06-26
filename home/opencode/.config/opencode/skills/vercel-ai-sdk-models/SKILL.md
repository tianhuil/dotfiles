---
name: vercel-ai-sdk-models
description: >-
  Configure and use custom LLM models with Vercel AI SDK and OpenCode CLI.
  Covers OpenAI-compatible providers (opencode.ai Zen, z.ai), Google Gemini,
  and other custom endpoints. Use when setting up models in a project using
  @ai-sdk/openai-compatible or @ai-sdk/google, or when configuring OpenCode CLI
  to use custom model providers.
---

# Vercel AI SDK Custom Models & OpenCode CLI Configuration

## Models

| Provider | Model ID | Type |
|----------|----------|------|
| OpenCode Zen | `big-pickle` | Free via opencode.ai |
| OpenCode Zen | `minimax-m2.5-free` | Free via opencode.ai |
| OpenCode Zen | `hy3-preview-free` | Free via opencode.ai |
| OpenCode Zen | `nemotron-3-super-free` | Free via opencode.ai |
| OpenCode Zen | `gpt-5-nano` | Free via opencode.ai |
| Google | `gemini-2.5-flash` | Requires `GOOGLE_GENERATIVE_AI_API_KEY` |
| z.ai | `glm-5-turbo` | Requires `ZAI_API_KEY` |
| z.ai | `GLM-4.5-Air` | Requires `ZAI_API_KEY` |

---

## Vercel AI SDK Setup (TypeScript)

### Install

```bash
npm install ai @ai-sdk/openai-compatible @ai-sdk/google
```

### Provider: OpenCode Zen (Free Models)

```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

export const opencodeZen = createOpenAICompatible({
  name: "opencode-zen",
  apiKey: "public",
  baseURL: "https://opencode.ai/zen/v1",
})

// Use with generateText, streamText, etc.
import { generateText } from "ai"

const { text } = await generateText({
  model: opencodeZen("big-pickle"),
  prompt: "Hello world",
})
```

Available models: `big-pickle`, `minimax-m2.5-free`, `hy3-preview-free`, `nemotron-3-super-free`, `gpt-5-nano`

### Provider: z.ai

```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

export const zaiCodingPlan = createOpenAICompatible({
  name: "zai-coding-plan",
  apiKey: process.env.ZAI_API_KEY!,
  baseURL: "https://api.z.ai/api/coding/paas/v4",
})

// Use models
const { text } = await generateText({
  model: zaiCodingPlan("glm-5-turbo"),
  prompt: "Hello world",
})
```

Available models: `glm-5-turbo`, `GLM-4.5-Air`

### Provider: Google Gemini

```typescript
import { google } from "@ai-sdk/google"

// Uses GOOGLE_GENERATIVE_AI_API_KEY env var automatically
const { text } = await generateText({
  model: google("gemini-2.5-flash"),
  prompt: "Hello world",
})
```

---

## OpenCode CLI Configuration

Add providers to `opencode.json` (project-level) or `~/.config/opencode/opencode.json` (global).

### OpenCode Zen (Free Models)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "opencode-zen": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "OpenCode Zen (free)",
      "options": {
        "baseURL": "https://opencode.ai/zen/v1",
        "apiKey": "public"
      },
      "models": {
        "big-pickle": { "name": "Big Pickle" },
        "minimax-m2.5-free": { "name": "MiniMax M2.5 Free" },
        "hy3-preview-free": { "name": "HY3 Preview Free" },
        "nemotron-3-super-free": { "name": "Nemotron 3 Super Free" },
        "gpt-5-nano": { "name": "GPT-5 Nano" }
      }
    }
  }
}
```

### z.ai Models

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "zai": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "z.ai",
      "options": {
        "baseURL": "https://api.z.ai/api/coding/paas/v4",
        "apiKey": "{env:ZAI_API_KEY}"
      },
      "models": {
        "glm-5-turbo": { "name": "GLM-5 Turbo" },
        "GLM-4.5-Air": { "name": "GLM-4.5 Air" }
      }
    }
  }
}
```

### Google Gemini

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "google": {
      "models": {
        "gemini-2.5-flash": { "name": "Gemini 2.5 Flash" }
      }
    }
  }
}
```

Google is a built-in provider in OpenCode. Set `GOOGLE_GENERATIVE_AI_API_KEY` in your environment. No `npm` or `options` needed.

### Selecting a Model at Runtime

In OpenCode CLI, switch models interactively or via flag:

```bash
# Interactive model picker
opencode

# Then press Ctrl+K (or use /model command) to select a model

# Or specify directly
opencode --model opencode-zen:big-pickle
opencode --model zai:glm-5-turbo
opencode --model google:gemini-2.5-flash
```

---

## Environment Variables

| Variable | Provider | Required |
|----------|----------|----------|
| `ZAI_API_KEY` | z.ai | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini | Yes |
| _(none)_ | OpenCode Zen | No (uses `apiKey: "public"`) |
