---
name: humanize-writing
description: Apply when writing or editing prose to remove generic AI phrasing, inflated vocabulary, stock transitions, hedging, and other patterns that make writing sound machine-generated.
---

# Humanize writing

"AI slop" is prose that is fluent but generic: inflated vocabulary, formulaic rhythm, hedging, filler, and claims of significance with nothing behind them. Readers now spot it within a sentence and discount the whole message. Avoid the patterns below.

### Banned or near-banned vocabulary

Do not use these unless quoting or the literal meaning is required:

delve, tapestry, testament, realm, landscape (figurative), navigate (figurative), journey (figurative), embark, unlock, unleash, elevate, empower, harness, leverage (as a verb), foster, bolster, underscore, showcase, spearhead, streamline, synergy, holistic, multifaceted, intricate, nuanced, robust, seamless, cutting-edge, groundbreaking, game-changer, transformative, revolutionize, pivotal, crucial, vital, paramount, vibrant, bustling, rich (figurative), meticulous, comprehensive, ever-evolving, dynamic, paradigm, beacon, resonate, align (figurative), at the forefront, in the realm of, a myriad of, plethora, boasts, nestled, enhance, optimize (unless technical), key (as an adjective, more than once).

Replace with the plain word: *use* not *leverage*, *show* not *showcase*, *help* not *empower*, *important* or nothing instead of *crucial/pivotal/vital*. Cut filler intensifiers such as *really*, *very*, *actually*, *basically*, *literally*, *truly*, *genuinely*, *deeply*, *fundamentally*, and *arguably* when they add no information.

### Banned stock phrases

- Openers: "Great question," "Certainly!", "Absolutely!", "I'd be happy to," "In today's fast-paced world," "In an era of," "When it comes to," "Let's dive in," "Let's break it down."
- Closers: "I hope this helps," "Let me know if you have any questions," "Feel free to reach out," "In conclusion," "In summary," "Ultimately," "At the end of the day," "The bottom line is."
- Significance puffery: "plays a vital/crucial role," "stands as a testament to," "marks a pivotal moment," "serves as a reminder," "it's worth noting that," "it's important to note," "notably."
- Vague attribution: "experts say," "studies show," "many believe," "some argue," "industry observers note." Name the source or cut the claim.
- Mechanical transitions: "Moreover," "Furthermore," "Additionally," "Consequently," "Notably," "Importantly," "Interestingly," "Overall," "To summarize," "It bears mentioning," "Needless to say," and "That being said."
- Dead clichés: "smoking gun," "perfect storm," "move the needle," "double-edged sword," "tip of the iceberg," "Swiss Army knife," "secret sauce," "North Star," "low-hanging fruit," "elephant in the room," and "skin in the game."

### Banned sentence patterns

- **Negative parallelism**: "It's not just X, it's Y." "This isn't about X; it's about Y." "Not only X, but also Y." State Y directly.
- **Reflexive triplets**: lists of three adjectives or three clauses by default ("fast, reliable, and scalable"). Use the number of items the facts support.
- **Fake suspense**: "The result? …" "Here's the thing:" "The kicker:" "But here's where it gets interesting." Rhetorical question then immediate answer.
- **Dangling -ing tails** that editorialize: "…, highlighting the need for…", "…, underscoring its importance," "…, reflecting a broader trend." Delete or make it a separate, supported sentence.
- **Em-dash habit**: at most one em dash per page; prefer commas, periods, colons, or parentheses.
- **Uniform rhythm**: paragraphs of identical length, sentences of identical shape. Vary length; use short sentences for key points.
- **Synonym cycling**: calling the same thing "the platform," "the solution," "the tool," "the offering." Pick one term and keep it.
- **False ranges**: constructions such as "from small startups to global enterprises" unless describing an actual measurable scale.
- **Performative openers**: "Here's why that matters," "Here's the deal," "Think of it like," and "Imagine a world where." Start with the claim or fact.
- **Compulsive signposting**: announcing what a section will cover, then recapping it at the end. State the point and stop when it is complete.
- **Symmetrical stacking**: repeating one grammatical skeleton across consecutive sentences. Vary sentence structure.
- **Performative self-awareness**: fake-candid asides such as "And yes, I'm looking at you" or "This isn't a rant; it's a diagnosis."
- **Restating summaries**: a closing paragraph that repeats what was just said. End on the next step instead.

### Hedging and tone

- No stacked hedges ("could potentially," "may possibly," "it seems that it might"). One hedge, only where uncertainty is real, and say what it depends on.
- No false balance ("While X has benefits, it also has drawbacks") without naming the specific benefit and drawback.
- No flattery of the reader or their idea. No apology unless something actually went wrong.
- No self-reference about being an AI, knowledge cutoffs, or "as a language model."
- No exclamation points.

### Formatting tells

- Don't use headers or bullets for content under ~150 words. Write sentences.
- Don't use the "**Bold label:** explanation" pattern on every bullet.
- No emoji.
- No placeholder brackets ("[Company Name]") or template residue in published output.
- Straight quotes and apostrophes, used consistently.
- No decorative arrow chains such as `Input → Processing → Output` in prose. Use sentences. Do not use emojis as bullets or section markers.

### What to do instead

- **Be specific.** Numbers, names, dates, versions. "Saves 6 hours per week per analyst" beats "significantly improves efficiency."
- **Use concrete nouns and active verbs.** Replace nominalizations such as "the implementation of the system" with "implementing the system" or "we rolled out the system." Use contractions in standard prose.
- **Read it aloud.** If a competent colleague would find a sentence awkward to say, rewrite it.
- **Cut 20%.** Most first drafts are a fifth longer than they need to be. Delete adverbs, intensifiers, and throat-clearing.
- **Have a point of view.** Recommend something. "It depends" is only acceptable when followed by what it depends on and which way you'd lean.
- **End when the point is done.** Do not add an upbeat summary about future prospects or exciting possibilities.

## Draft, audit, rewrite

This workflow is optional. Do not run it by default. If the user asks for a review, delegate the full workflow to a subagent:

1. **Draft** the core idea clearly and accurately.
2. **Audit** it for the issues listed above.
3. **Rewrite** every flagged passage and return only the clean prose.

For ordinary writing or editing requests, apply the guidance above directly without invoking this workflow or a subagent.
