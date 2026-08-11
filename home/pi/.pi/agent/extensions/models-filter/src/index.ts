/**
 * pi-models-filter
 *
 * Regex-driven model catalog filter for pi's built-in providers.
 *
 * Reads config.yml next to this extension: a `filters` list of regexes
 * anchored against "<providerId>/<modelId>" and optional `providers`
 * overrides. No provider connection details need to be configured — the
 * extension auto-discovers providers from pi's builtins, reads stored
 * credentials from auth.json, and fetches model metadata from models.dev.
 *
 * Metadata resolution order (per model):
 *   1. models.dev API (https://models.dev/api.json) — authoritative source
 *   2. Provider's live /models endpoint (model IDs only)
 *   3. Hardcoded KNOWN_MODELS fallback table
 *
 * At load time the extension:
 *   1. Reads config.yml filter rules
 *   2. For each provider mentioned in filters:
 *      a. Fetches the models.dev API for that provider's full metadata
 *      b. Fetches the provider's live /v1/models for model IDs
 *      c. Merges: uses models.dev metadata where available, live catalog
 *         for IDs not in models.dev, KNOWN_MODELS as last resort
 *   3. Keeps only models matching a filter regex
 *   4. Re-registers each provider with just the filtered models via
 *      registerProvider() (queued before listModels runs)
 *
 * Built on bun runtime APIs when available (Bun.file, Bun.YAML); falls back
 * to node:fs + js-yaml under node-based pi.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FETCH_TIMEOUT_MS = 8000;
const PI_AGENT_DIR = path.join(process.env.HOME ?? process.env.USERPROFILE ?? "/", ".pi", "agent");
const MODELS_DEV_URL = "https://models.dev/api.json";

// ── YAML I/O (dual runtime) ─────────────────────────────────────────────────

async function readText(filePath: string): Promise<string> {
  if (typeof Bun !== "undefined" && typeof Bun.file === "function") {
    return Bun.file(filePath).text();
  }
  const { readFile } = await import("node:fs/promises");
  return readFile(filePath, "utf8");
}

async function parseYaml(text: string): Promise<unknown> {
  if (typeof Bun !== "undefined" && typeof Bun.YAML?.parse === "function") {
    return Bun.YAML.parse(text);
  }
  const { load } = await import("js-yaml");
  return load(text);
}

// ── Types ───────────────────────────────────────────────────────────────────

interface PiApi {
  registerProvider(name: string, config: Record<string, unknown>): void;
}

interface FilterRule {
  providerRe: RegExp;
  modelRe: RegExp;
  raw: string;
}

interface ProviderOverride {
  apiKey?: string;
  baseUrl?: string;
  name?: string;
  api?: string;
}

/** Shape of a single model entry in models.dev/api.json (under provider.models). */
interface ModelsDevModel {
  id: string;
  name: string;
  reasoning: boolean;
  reasoning_options?: Array<{ type: string; values?: string[]; max?: number }>;
  modalities?: { input: string[]; output: string[] };
  limit?: { context?: number; output?: number };
  cost?: { input?: number; output?: number };
  interleaved?: { field: string };
  status?: string;
}

/** Shape of a provider entry in models.dev/api.json. */
interface ModelsDevProvider {
  id: string;
  name: string;
  api?: string;
  models: Record<string, ModelsDevModel>;
}

// ── Known provider catalog URLs ────────────────────────────────────────────
// Maps built-in provider ids to their live /v1/models endpoints.
// Used to discover model IDs not yet in models.dev.

const PROVIDER_CATALOGS: Record<string, { url: string; api: string }> = {
  opencode: { url: "https://opencode.ai/zen/v1", api: "openai-completions" },
  zai: { url: "https://api.z.ai/api/coding/paas/v4", api: "openai-completions" },
};

// ── Static fallback metadata ───────────────────────────────────────────────
// Mirrored from pi's bundled provider data + models.dev.
// Only used when both models.dev and the live catalog fail.

interface ModelMeta {
  name: string;
  reasoning: boolean;
  thinkingLevelMap?: Record<string, string | null>;
  compat?: Record<string, unknown>;
  input: ("text" | "image")[];
  contextWindow: number;
  maxTokens: number;
}

const KNOWN_MODELS: Record<string, ModelMeta> = {
  // ── zai ──
  "glm-4.5-air": { name: "GLM-4.5-Air", reasoning: true, input: ["text"], contextWindow: 131072, maxTokens: 98304, compat: { supportsReasoningEffort: false, thinkingFormat: "zai" } },
  "glm-4.7": { name: "GLM-4.7", reasoning: true, input: ["text"], contextWindow: 204800, maxTokens: 131072, compat: { supportsReasoningEffort: false, thinkingFormat: "zai", zaiToolStream: true } },
  "glm-5-turbo": { name: "GLM-5-Turbo", reasoning: true, input: ["text"], contextWindow: 200000, maxTokens: 131072, compat: { supportsReasoningEffort: false, thinkingFormat: "zai", zaiToolStream: true } },
  "glm-5.1": { name: "GLM-5.1", reasoning: true, input: ["text"], contextWindow: 200000, maxTokens: 131072, compat: { supportsReasoningEffort: false, thinkingFormat: "zai", zaiToolStream: true } },
  "glm-5.2": { name: "GLM-5.2", reasoning: true, thinkingLevelMap: { minimal: null, low: "high", medium: "high", high: "high", max: "max" }, input: ["text"], contextWindow: 1000000, maxTokens: 131072, compat: { supportsReasoningEffort: true, thinkingFormat: "zai", zaiToolStream: true } },
  "glm-5v-turbo": { name: "GLM-5V-Turbo", reasoning: true, input: ["text", "image"], contextWindow: 200000, maxTokens: 131072, compat: { supportsReasoningEffort: false, thinkingFormat: "zai", zaiToolStream: true } },

  // ── opencode free tier ──
  "big-pickle": { name: "Big Pickle", reasoning: true, input: ["text"], contextWindow: 200000, maxTokens: 32000 },
  "deepseek-v4-flash-free": {
    name: "DeepSeek V4 Flash Free", reasoning: true,
    thinkingLevelMap: { minimal: null, low: null, medium: null, high: "high", max: "max" },
    compat: { requiresReasoningContentOnAssistantMessages: true },
    input: ["text"], contextWindow: 200000, maxTokens: 128000,
  },
  "laguna-s-2.1-free": {
    name: "Laguna S 2.1 Free", reasoning: true,
    thinkingLevelMap: { minimal: null, low: "low", medium: "medium", high: "high", xhigh: null, max: null },
    input: ["text"], contextWindow: 256000, maxTokens: 32000,
  },
  "ling-3.0-flash-free": {
    name: "Ling-3.0-flash Free", reasoning: true,
    thinkingLevelMap: { minimal: null, low: "low", medium: "medium", high: "high", xhigh: null, max: null },
    input: ["text"], contextWindow: 262144, maxTokens: 32768,
  },
  "mimo-v2.5-free": { name: "MiMo V2.5 Free", reasoning: true, input: ["text", "image"], contextWindow: 200000, maxTokens: 32000 },
  "nemotron-3-ultra-free": { name: "Nemotron 3 Ultra Free", reasoning: true, input: ["text"], contextWindow: 1000000, maxTokens: 128000 },
  "north-mini-code-free": {
    name: "North Mini Code Free", reasoning: true,
    thinkingLevelMap: { off: "none", minimal: null, low: null, medium: null, high: "high", xhigh: null, max: null },
    input: ["text"], contextWindow: 256000, maxTokens: 64000,
  },
};

const GENERIC_DEFAULTS: ModelMeta = {
  name: "Unknown", reasoning: true,
  input: ["text"], contextWindow: 200000, maxTokens: 32000,
};

// ── Config loading ──────────────────────────────────────────────────────────

function extensionDir(): string {
  if (typeof import.meta.dir === "string" && import.meta.dir.length > 0) {
    return import.meta.dir;
  }
  return path.dirname(fileURLToPath(import.meta.url));
}

function findConfigPath(): string | undefined {
  for (const candidate of [path.join(extensionDir(), "config.yml"), path.join(extensionDir(), "..", "config.yml")]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

interface Config {
  filters: string[];
  providers: Record<string, ProviderOverride>;
}

async function loadConfig(): Promise<Config> {
  const configPath = findConfigPath();
  if (!configPath) {
    console.warn("[models-filter] config.yml not found; nothing to filter");
    return { filters: [], providers: {} };
  }
  const raw = await readText(configPath);
  const parsed = (await parseYaml(raw)) as Record<string, unknown> | null;

  const filters = Array.isArray(parsed?.filters)
    ? (parsed.filters as unknown[]).filter((v): v is string => typeof v === "string")
    : [];

  const providers: Record<string, ProviderOverride> = {};
  if (parsed && typeof parsed.providers === "object" && parsed.providers !== null) {
    for (const [key, val] of Object.entries(parsed.providers as Record<string, unknown>)) {
      if (typeof val !== "object" || val === null) continue;
      const obj = val as Record<string, unknown>;
      const override: ProviderOverride = {};
      if (typeof obj.apiKey === "string") override.apiKey = obj.apiKey;
      if (typeof obj.baseUrl === "string") override.baseUrl = obj.baseUrl;
      if (typeof obj.name === "string") override.name = obj.name;
      if (typeof obj.api === "string") override.api = obj.api;
      if (Object.keys(override).length > 0) providers[key] = override;
    }
  }

  return { filters, providers };
}

// ── Regex compilation ──────────────────────────────────────────────────────

function compileRules(filters: string[]): FilterRule[] {
  const rules: FilterRule[] = [];
  for (const raw of filters) {
    const slash = raw.indexOf("/");
    if (slash <= 0 || slash === raw.length - 1) {
      console.warn(`[models-filter] skipping malformed rule "${raw}"`);
      continue;
    }
    try {
      rules.push({
        providerRe: new RegExp(`^${raw.slice(0, slash)}$`),
        modelRe: new RegExp(`^${raw.slice(slash + 1)}$`),
        raw,
      });
    } catch (error) {
      console.warn(`[models-filter] skipping invalid regex "${raw}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return rules;
}

/** Extract provider ids referenced in the filter rules. */
function referencedProviders(rules: FilterRule[]): Set<string> {
  const ids = new Set<string>();
  for (const r of rules) {
    const m = r.raw.match(/^([^/]+)/);
    if (m?.[1]) ids.add(m[1]);
  }
  return ids;
}

// ── Stored credential lookup ────────────────────────────────────────────────
// Reads ~/.pi/agent/auth.json for provider keys the user has stored via `/login`.

interface StoredCredential {
  type: string;
  key?: string;
  env?: Record<string, string>;
}

let cachedAuthJson: Record<string, StoredCredential> | null | undefined;

function readStoredCredentials(): Record<string, StoredCredential> | null {
  if (cachedAuthJson !== undefined) return cachedAuthJson;
  const authPath = path.join(PI_AGENT_DIR, "auth.json");
  if (!existsSync(authPath)) { cachedAuthJson = null; return null; }
  try {
    cachedAuthJson = JSON.parse(readFileSync(authPath, "utf8")) as Record<string, StoredCredential>;
  } catch {
    cachedAuthJson = null;
  }
  return cachedAuthJson;
}

function resolveApiKey(providerId: string, configOverride?: string): string | undefined {
  if (configOverride) return configOverride;
  const stored = readStoredCredentials()?.[providerId];
  if (stored?.key) return stored.key;
  if (stored?.env) {
    for (const v of Object.values(stored.env)) {
      if (v.startsWith("sk-") || v.length > 10) return v;
    }
  }
  return undefined;
}

// ── Metadata resolution from models.dev ───────────────────────────────────

interface ResolvedModel {
  id: string;
  name: string;
  reasoning: boolean;
  thinkingLevelMap?: Record<string, string | null>;
  compat?: Record<string, unknown>;
  input: ("text" | "image")[];
  contextWindow: number;
  maxTokens: number;
  costInput: number;
  costOutput: number;
  costCacheRead: number;
  costCacheWrite: number;
}

/** Convert a models.dev reasoning_options array to pi's thinkingLevelMap. */
function reasoningOptionsToThinkingMap(options: ModelsDevModel["reasoning_options"]): Record<string, string | null> | undefined {
  if (!options || options.length === 0) return undefined;
  for (const opt of options) {
    if (opt.type === "effort" && opt.values?.length) {
      const map: Record<string, string | null> = {};
      for (const v of opt.values) {
        // pi's thinking levels: off, minimal, low, medium, high, xhigh, max
        map[v] = v;
      }
      return map;
    }
  }
  return undefined;
}

/** Convert input modalities string list to pi's typed array. */
function toInputModalities(modalities?: string[]): ("text" | "image")[] {
  if (!modalities) return ["text"];
  const result: ("text" | "image")[] = [];
  if (modalities.includes("text")) result.push("text");
  if (modalities.includes("image") || modalities.includes("video") || modalities.includes("audio") || modalities.includes("pdf")) result.push("image");
  return result.length > 0 ? result : ["text"];
}

/** Resolve a model's metadata from models.dev data. */
function resolveFromModelsDev(md: ModelsDevModel, providerId: string): ResolvedModel {
  const input = toInputModalities(md.modalities?.input);
  const compat: Record<string, unknown> = { supportsStore: false, supportsDeveloperRole: false, maxTokensField: "max_tokens" };

  // Set reasoning-specific compat flags
  if (md.reasoning && md.interleaved?.field) {
    compat.requiresReasoningContentOnAssistantMessages = true;
  }
  // Z.AI-specific compat
  if (providerId === "zai") {
    compat.thinkingFormat = "zai";
    compat.zaiToolStream = true;
    if (md.reasoning_options?.some(o => o.type === "effort")) {
      compat.supportsReasoningEffort = true;
    }
  }

  return {
    id: md.id,
    name: md.name,
    reasoning: md.reasoning,
    thinkingLevelMap: reasoningOptionsToThinkingMap(md.reasoning_options),
    compat,
    input,
    contextWindow: md.limit?.context ?? 200000,
    maxTokens: md.limit?.output ?? 32000,
    costInput: md.cost?.input ?? 0,
    costOutput: md.cost?.output ?? 0,
    costCacheRead: (md.cost as Record<string, unknown> | undefined)?.cache_read as number ?? 0,
    costCacheWrite: (md.cost as Record<string, unknown> | undefined)?.cache_write as number ?? 0,
  };
}

/** Fall back to KNOWN_MODELS or generic defaults. */
function resolveFallback(id: string): ResolvedModel {
  const meta = KNOWN_MODELS[id] ?? GENERIC_DEFAULTS;
  const compat: Record<string, unknown> = { supportsStore: false, supportsDeveloperRole: false, maxTokensField: "max_tokens", ...(meta.compat ?? {}) };
  return {
    id,
    name: meta.name === "Unknown" ? id : meta.name,
    reasoning: meta.reasoning,
    thinkingLevelMap: meta.thinkingLevelMap,
    compat,
    input: meta.input,
    contextWindow: meta.contextWindow,
    maxTokens: meta.maxTokens,
    costInput: 0,
    costOutput: 0,
    costCacheRead: 0,
    costCacheWrite: 0,
  };
}

// ── Catalog fetching ─────────────────────────────────────────────────────

async function fetchModelsDev(): Promise<Record<string, ModelsDevProvider>> {
  const response = await fetch(MODELS_DEV_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`GET ${MODELS_DEV_URL} -> ${response.status}`);
  return (await response.json()) as Record<string, ModelsDevProvider>;
}

async function fetchLiveCatalog(baseUrl: string, apiKey?: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/models`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  const payload = (await response.json()) as unknown;
  const data = Array.isArray(payload) ? payload : (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) throw new Error(`unexpected catalog shape from ${url}`);
  return data
    .map((entry) => typeof entry === "string" ? entry : (entry && typeof entry === "object" && "id" in entry) ? String((entry as { id: unknown }).id) : "")
    .filter((id) => id.length > 0);
}

// ── Model conversion for pi's registerProvider ──────────────────────────────

function toModelConfig(resolved: ResolvedModel): Record<string, unknown> {
  return {
    id: resolved.id,
    name: resolved.name,
    reasoning: resolved.reasoning,
    ...(resolved.thinkingLevelMap ? { thinkingLevelMap: resolved.thinkingLevelMap } : {}),
    compat: resolved.compat,
    input: resolved.input,
    cost: {
      input: resolved.costInput,
      output: resolved.costOutput,
      cacheRead: resolved.costCacheRead,
      cacheWrite: resolved.costCacheWrite,
    },
    contextWindow: resolved.contextWindow,
    maxTokens: resolved.maxTokens,
  };
}

// ── Factory ─────────────────────────────────────────────────────────────────

export default async function (pi: PiApi): Promise<void> {
  const config = await loadConfig();
  const rules = compileRules(config.filters);

  if (rules.length === 0) {
    console.warn("[models-filter] no filter rules; nothing to do");
    return;
  }

  const providerIds = referencedProviders(rules);
  if (providerIds.size === 0) return;

  // Fetch models.dev once for all providers
  let modelsDev: Record<string, ModelsDevProvider> | null = null;
  try {
    modelsDev = await fetchModelsDev();
    console.info(`[models-filter] models.dev: ${Object.keys(modelsDev).length} providers loaded`);
  } catch (error) {
    console.warn(`[models-filter] models.dev fetch failed (${error instanceof Error ? error.message : String(error)}); using live catalog + static fallback`);
  }

  for (const providerId of providerIds) {
    const providerRules = rules.filter((r) => r.providerRe.test(providerId));
    const catalog = PROVIDER_CATALOGS[providerId];
    if (!catalog) {
      console.warn(`[models-filter] unknown provider "${providerId}" — add its catalog URL to PROVIDER_CATALOGS`);
      continue;
    }

    const override = config.providers[providerId];
    const apiKey = resolveApiKey(providerId, override?.apiKey);
    const overrideBaseUrl = override?.baseUrl ?? catalog.url;
    const overrideApi = override?.api ?? catalog.api;

    // Get models.dev metadata for this provider
    const mdProvider = modelsDev?.[providerId];
    const mdModels: Record<string, ModelsDevModel> = mdProvider?.models ?? {};

    // Also fetch live catalog for IDs not in models.dev
    let liveIds: string[] = [];
    let liveOk = false;
    try {
      liveIds = await fetchLiveCatalog(overrideBaseUrl, apiKey);
      liveOk = true;
    } catch (error) {
      console.warn(`[models-filter] ${providerId}: live catalog fetch failed (${error instanceof Error ? error.message : String(error)})`);
    }

    // Merge: start with models.dev models, add live-only IDs
    const allIds = new Set(Object.keys(mdModels));
    for (const id of liveIds) allIds.add(id);

    if (allIds.size === 0) {
      // Final fallback: static KNOWN_MODELS
      for (const id of Object.keys(KNOWN_MODELS)) allIds.add(id);
      console.warn(`[models-filter] ${providerId}: no models from models.dev or live catalog; using static fallback`);
    }

    // Apply filters
    const kept = [...allIds].filter((id) => providerRules.some((r) => r.modelRe.test(id)));
    if (kept.length === 0) {
      console.warn(`[models-filter] ${providerId}: no models matched filters; skipping`);
      continue;
    }

    // Resolve metadata for each kept model
    const resolved = kept.map((id) => {
      const md = mdModels[id];
      if (md) return resolveFromModelsDev(md, providerId);
      return resolveFallback(id);
    });

    // Register the provider with filtered models
    const registration: Record<string, unknown> = {
      baseUrl: overrideBaseUrl,
      api: overrideApi,
      models: resolved.map(toModelConfig),
    };
    // Only pass apiKey to registerProvider when the user explicitly configured it;
    // pi's own stored auth handles credentials for providers not in config.yml.
    if (override?.apiKey) registration.apiKey = override.apiKey;

    pi.registerProvider(providerId, registration);

    const source = Object.keys(mdModels).length > 0 ? "models.dev" : liveOk ? `${liveIds.length} live` : "static fallback";
    console.info(`[models-filter] ${providerId}: ${kept.length}/${allIds.size} (${source}): ${kept.join(", ")}`);
  }
}
