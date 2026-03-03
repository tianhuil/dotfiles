---
description: Design a feature; writes markdown design files for a human to review and an agent to execute.  Place in `notes/design` folder.
---

# Source #1

Writing effective design documents for large language models (LLMs) involves clear structure, precise language, and iterative refinement to communicate complex system ideas. These docs guide development teams in building, deploying, or integrating LLM-based features.

## Core Structure
Use a consistent template with these sections: **Problem Statement**, Goals/Non-Goals, Proposed Solution (high-level then detailed), Alternatives Considered, Risks/Mitigations, and Implementation Plan. Start with a one-page executive summary for quick scans. Limit docs to 5-10 pages, focusing on diagrams like system architecture flows over verbose text. [teamblind](https://www.teamblind.com/post/tips-on-writing-design-docs-hgk674ms)

## LLM-Friendly Practices
Write in concise, jargon-free prose with defined terms on first use; pair concepts with runnable code snippets or prompts near explanations. Employ markdown hierarchy (H1-H3) for scannability and XML-like tags (<example>...</example>) sparingly to label key elements like prompts or outputs. Chunk content into 200-400 word sections for better LLM ingestion during reviews. [dev](https://dev.to/joshtom/optimizing-technical-documentations-for-llms-4bcd)

## Drafting Workflow
Collect team examples, then use an LLM to generate an initial draft by feeding it templates and your raw ideas (e.g., 20 bullet points). Iterate with senior reviews: share drafts, incorporate feedback, and re-prompt the LLM for revisions. Test the doc by querying an LLM about it to spot ambiguities. [developers.google](https://developers.google.com/tech-writing/two/llms)

## Comparison of Key Tips

| Aspect          | Human-Focused                  | LLM-Optimized Addition                  |
|-----------------|--------------------------------|-----------------------------------------|
| **Language**   | Precise, active voice         | Plain, positive examples only  [mbleigh](https://mbleigh.dev/posts/rules-for-rules/)  |
| **Examples**   | Few-shot in context           | 1-2 complete use cases, tagged  [mbleigh](https://mbleigh.dev/posts/rules-for-rules/) |
| **Validation** | Peer review                   | LLM Q&A testing  [dev](https://dev.to/joshtom/optimizing-technical-documentations-for-llms-4bcd)                |

## Common Pitfalls
Avoid vague headings, negative phrasing (e.g., "don't do X"), or over-nesting structures, as they confuse LLMs. Always prioritize user clarity first—good human docs naturally suit LLMs. [mbleigh](https://mbleigh.dev/posts/rules-for-rules/)


# Source 2

Here's a synthesis of the best practices for writing design docs for LLMs, drawing from multiple sources and perspectives:

---

## Best Practices for Writing Design Docs for LLMs

There are really two distinct concerns here — writing design docs *about* LLM features/systems (for your engineering team), and writing docs *for* LLMs to consume (so AI tools can reason about your system accurately). Both matter and often overlap. Here's a breakdown of both:

---

### Writing Design Docs *About* LLM Features (for Engineers)

**Start with a spec before any code.** A proven approach is to first brainstorm a detailed specification with the AI, then outline a step-by-step plan before writing any actual code. For a new project, this process should cover requirements, architecture decisions, data models, and a testing strategy — compiled into a `spec.md` that forms the foundation for development.

**Define behavior, not just requirements.** Specifications should use domain-oriented language to describe business intent rather than tech-bound implementations. They should have a clear structure, use Given/When/Then-style scenarios, and strive for completeness while remaining concise — covering the critical path without enumerating every edge case.

**Document the non-determinism explicitly.** LLMs are powerful but probabilistic — they need guardrails and audit trails. Design docs should reflect this by specifying failure modes, confidence thresholds, human-approval gates, and rollback mechanisms rather than assuming the system will always behave as intended.

**Specify model selection criteria.** When documenting model choices, clearly identify the use case and the minimum core AI capabilities required. Benchmark scores are a useful starting point, but real-world performance on tasks relevant to your product often varies — so your design doc should explain why a specific model was chosen for your context.

**Include evaluation strategy upfront.** Product managers help define functionality and connect user needs to model behavior, while ML engineers focus on prompt design, model tuning, and output evaluation. A good design doc should specify who owns evaluation, what metrics matter, and how the system will be tested before and after deployment.

---

### Writing Docs *For* LLMs to Consume (so AI tools can reason about your system)

**Make every section self-contained.** AI systems work with chunks — they process documentation as discrete, independent pieces rather than reading it as a continuous narrative. They lose implicit connections between sections unless explicitly stated, and cannot infer unstated information. Documentation should be explicit, self-contained, and contextually complete: the more a chunk can stand alone while maintaining clear relationships to related content, the better it can be understood.

**Use consistent terminology throughout.** LLMs struggle with inconsistency and must infer whether different terms are synonyms or distinct concepts. When you use "API key," "access token," and "auth credential" interchangeably, the AI creates probabilistic guesses about their relationships, leading to incorrect responses. Pick one term and use it consistently.

**Format code blocks explicitly.** Inline code without proper formatting can be parsed ambiguously by AI systems, causing commands to get merged or altered when they appear in AI-generated responses. Properly formatted code blocks ensure AI systems can provide accurate code examples.

**Never rely on visual hierarchy alone.** LLMs process text sequentially, not visually. They can't scan a page or interpret complex layouts — they ingest tokenized content linearly. Traditional documentation often relies on visual hierarchy, screenshots, and formatted PDFs that are opaque to AI systems. Structure for sequential reading and semantic understanding instead.

**Keep heading hierarchy consistent.** LLMs build mental maps from heading hierarchy. Skipped levels (e.g., H1→H3) break this cognitive model, sometimes causing the AI to misunderstand content relationships and retrieve irrelevant sections when answering questions.

**Avoid pronouns and vague references.** Pronouns and vague references create ambiguity that AI systems struggle with. Instead of "Update the configuration file and restart the server," write "Update the `config.yaml` file and restart the application server." Coreference resolution is challenging for LLMs.

**Include product/feature names in every section.** AI retrieval is based on semantic similarity. If important terms aren't present in a chunk, that chunk won't be retrieved for relevant queries, even if it contains exactly the information needed. Include specific product or feature names when documenting functionality — don't rely on context from surrounding sections.

---

### Meta-principle

LLM-friendly documentation is ultimately human-friendly documentation. The same qualities that help AI systems understand your content — clarity, structure, consistency, and examples — also benefit human readers. Investing in well-structured design docs pays dividends for both your team and the AI tools they use daily.

# Source 3

Writing a design document for a Large Language Model (LLM) system is distinct from traditional software design. Because LLMs are probabilistic, your document must shift from "how the code works" to "how the system's behavior is steered and measured."

Below are the 2026 best practices for structuring and writing these documents.

---

## 1. The "System-First" Architecture

Don't treat the LLM as a black box. Your design doc should explicitly map the **data pipeline** that surrounds the model.

* **Orchestration Logic:** Define if you are using a linear chain, a state machine (for agents), or a Directed Acyclic Graph (DAG).
* **The RAG Lifecycle:** If using Retrieval-Augmented Generation, document the four stages: *Ingestion* (cleaning/chunking), *Embedding* (model version), *Retrieval* (vector DB choice), and *Augmentation* (reranking strategies).
* **Hybrid Patterns:** Note where classical ML (like a Random Forest classifier) is used to pre-filter inputs or post-validate outputs.

---

## 2. Model Selection & Rationale

In 2026, "the biggest model" is rarely the right answer. Justify your choice based on the **Three Pillars of Inference**:

* **Context Window:** Why does this use case need 32k vs. 1M tokens?
* **Reasoning Tier:** Does this require an "o1-style" reasoning model (high latency/cost) or a "Flash/Air" model for speed?
* **Cost vs. Latency:** Provide a table comparing projected costs and P99 latency targets.

---

## 3. The "Evaluation" Section (Non-Negotiable)

Since you can't unit test a prose response, your design doc must define **what "good" looks like**.

* **Golden Dataset:** Mention the curation of 50–100 "ground truth" examples used for regression testing.
* **Metrics Selection:**
* **Faithfulness:** Does the answer match the retrieved context?
* **Instruction Compliance:** Did it follow the formatting rules (e.g., "Output only JSON")?
* **LLM-as-a-Judge:** Define the prompt and model used to grade other outputs.


* **Evaluation Loop:** Describe how often evals run (e.g., "Every PR" vs. "Weekly on production logs").

---

## 4. Prompt & Guardrail Design

Prompts are application logic and should be treated as such in documentation.

* **Versioning:** How are prompts stored? (e.g., "Hardcoded in Git" vs. "Managed via a Prompt CMS").
* **Negative Constraints:** List what the model **must not** do (e.g., "Never mention competitors" or "Do not provide financial advice").
* **Safety Layers:** Document the specific guardrail tiers (e.g., Amazon Bedrock Guardrails, Llama Guard) and how they handle PII (Personally Identifiable Information) or Prompt Injection.

---

## 5. Failure Modes & Defensive UX

LLMs will eventually fail or hallucinate. Your design doc must account for the "Unhappy Path":

* **Fallback Strategies:** If the LLM times out or returns garbage, what is the default? (e.g., "Show a canned response" or "Retry with a cheaper model").
* **Friction by Design:** How does the UI signal uncertainty to the user? (e.g., "Sources cited," "Confidence badges," or "Human-in-the-loop triggers").

---

## Design Doc Template Summary

| Section | Key Question to Answer |
| --- | --- |
| **Problem Statement** | What specific language-heavy workflow are we automating? |
| **User Intent** | What are the typical prompts and edge-case inputs? |
| **Data Strategy** | Where is the "source of truth" coming from (RAG, API, or Fine-tuning)? |
| **Model Config** | Model name, temperature, top-p, and system instructions. |
| **Security** | How are we preventing prompt injection and data leakage? |
| **Monitoring** | How do we track "drift" or "hallucinations" in production? |

---

**Would you like me to draft a specific template for a RAG-based design document that you can use as a starting point?**
