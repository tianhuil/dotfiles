---
name: pyramid-writing
description: Structure prose answer-first with Barbara Minto's Pyramid Principle. Use when writing or editing a document a person reads — report, research note, design doc, PR body, README, email, or summary.
---

# Pyramid writing

Put the answer first, then the reasons, then the evidence. Readers absorb ideas fastest top-down: one idea at the top, each lower level answering the question the level above raises. Think bottom-up; write top-down.

## Terms

- **Governing Thought**: the one sentence at the top that answers the reader's question. A claim, not a topic: "Move auth to Clerk; it removes three services," not "This doc covers auth options."
- **Key Line**: the points directly under the Governing Thought. Together they prove it, and they become the document's sections.
- **Grouping**: a set of sibling points under one parent.
- **SCQ**: the introduction pattern Situation → Complication → Question, which leads the reader to the question the Governing Thought answers.
- **MECE**: Mutually Exclusive, Collectively Exhaustive. Siblings do not overlap and together leave no gap.

## Rules

1. Every point summarizes the points grouped below it.
2. Points in one Grouping are the same kind (all reasons, all steps, all problems), nameable by one plural noun.
3. Points in one Grouping follow one logical order:
   - **Time**: steps in sequence, cause before effect.
   - **Structure**: parts of a whole (components, regions, teams).
   - **Rank**: most important first.
4. Each Grouping is MECE.
5. Each Grouping holds 2–5 points. More means a missing level; one means the point belongs to its parent.

## Vertical: question and answer

Each statement raises a question in the reader's mind: why, how, which, or so what. The level below answers exactly that question. Answer every question you raise; raise only questions the reader cares about.

## Horizontal: inductive over deductive

- **Inductive** (default): independent points of the same kind that each support the parent, such as three reasons. Readers can scan and skip.
- **Deductive**: a chain where each point follows from the last (fact → rule → therefore). Keep it low in the pyramid and short (≤4 steps); the reader holds the whole chain before reaching the point.

Even with a deductive argument, state its conclusion first.

## Introduction: SCQ

- **Situation**: what the reader already knows and accepts.
- **Complication**: what changed, creating the need to write.
- **Question**: what the Complication makes the reader ask.
- **Answer**: the Governing Thought.

The introduction tells a story the reader already agrees with; new facts and arguments go in the body. Default to answer-first: Governing Thought in the first sentence, then the Situation and Complication only as far as the reader lacks them. Many short documents need no introduction beyond the Governing Thought.

## Summaries carry insight

Write each parent as what its children mean, not what kind they are.

- Blank: "There are three problems." / heading "Findings"
- Summary: "Mobile checkout fails because of three timeouts." / heading "Cache misses cause 80% of latency"

## Building the pyramid

Top-down, when you know the answer:

1. Name the reader and the Question they have.
2. Write the Governing Thought.
3. Check that the SCQ leads to that Question.
4. Write the question the Governing Thought raises; answer it with the Key Line.
5. Repeat until each leaf is a fact, example, or citation.

Bottom-up, when you do not:

1. List every point you want to make.
2. Group same-kind points; write what each Grouping means.
3. Group those summaries until one Governing Thought remains.
4. Re-check top-down.

## Display

- Governing Thought: the first sentence (summary, TL;DR, PR description opening).
- Key Line: section headings, each a claim, in parallel grammar.
- Grouping: bullets for peers, numbers for Time order.
- Paragraphs: one idea each, topic sentence first.
- Transitions: when moving between sections, tie back to the Governing Thought.

## Check

The document is done when every item holds:

- [ ] A reader who stops after the first sentence has the answer.
- [ ] Each parent and heading is a claim that summarizes its children.
- [ ] Each Grouping is same-kind, ordered, MECE, and 2–5 points.
- [ ] Every question raised is answered below it.

## Sources

- Barbara Minto, *The Pyramid Principle: Logic in Writing and Thinking*.
- Barbara Minto, "The Minto Pyramid Principle," https://barbaraminto.com/concept (accessed 2026-11-08).
