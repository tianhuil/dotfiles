---
name: model-inventory
description: >-
  Look up AI model specifications, pricing, capabilities, and token limits across all major providers.
  Use when the user asks about a specific model's details (pricing, context window, modalities,
  reasoning support, release date), wants to compare models, or needs accurate, up-to-date
  AI model facts — never answer from memory. Source: https://github.com/anomalyco/models.dev
---

# Model Inventory (models.dev)

Comprehensive, community-maintained database of AI model specs, pricing, and
capabilities across every major provider.

**Source:** https://github.com/anomalyco/models.dev  
**API:** `https://models.dev/api.json` (provider endpoints + model metadata)  
**Models-only:** `https://models.dev/models.json` (provider-agnostic model facts)  
**Catalog:** `https://models.dev/catalog.json` (combined endpoints + metadata)

## How to use

1. **Fetch the API JSON** for the data you need:
   ```bash
   # Full catalog — every provider, every model, pricing + metadata
   curl -s https://models.dev/api.json | jq .

   # Provider-agnostic model metadata only (no pricing/endpoints)
   curl -s https://models.dev/models.json | jq .

   # Combined: provider endpoints + model metadata
   curl -s https://models.dev/catalog.json | jq .
   ```

2. **Parse with `jq`** to find what you need. Examples:
   ```bash
   # All models from a provider
   curl -s https://models.dev/api.json | jq '.anthropic.models'

   # Single model details
   curl -s https://models.dev/api.json | jq '.anthropic.models["claude-sonnet-4-5"]'

   # All models that support vision (image input)
   curl -s https://models.dev/api.json | jq '[.[] | .models[] | select(.modalities.input[]? == "image")]'

   # Cheapest models with reasoning
   curl -s https://models.dev/api.json | jq '[.[] | .models[] | select(.reasoning == true)] | sort_by(.cost.input) | .[0:10]'
   ```

3. **For a specific model**, key fields to report:
   - `name`, `description`, `family` — identity
   - `cost.input`, `cost.output`, `cost.cache_read`, `cost.cache_write` — pricing per million tokens (USD)
   - `limit.context`, `limit.input`, `limit.output` — token limits
   - `modalities.input`, `modalities.output` — supported I/O types (text, image, video, pdf, audio)
   - `reasoning`, `tool_call`, `structured_output`, `attachment`, `temperature` — capability flags
   - `reasoning_options` — effort levels / budget tokens supported
   - `knowledge` — training data cutoff
   - `release_date`, `last_updated` — freshness
   - `benchmarks` — performance scores with sources

## Providers covered

Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, Alibaba/Qwen, xAI,
Perplexity, Cohere, and hundreds more including inference providers
(Fireworks, Together, Cerebras, Groq, OpenRouter, etc.).

## Keeping this skill current

The data is maintained at https://github.com/anomalyco/models.dev — if the
API schema changes or new fields are added, update this skill accordingly.
