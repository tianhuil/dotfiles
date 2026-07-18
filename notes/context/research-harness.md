## Step 0
In tmpfs, checkout https://github.com/code-yeongyu/oh-my-openagent and https://github.com/everyinc/compound-engineering-plugin;  They are two harnesses. Each harness is basically large systems of prompts.  We want to analyze these.

## Step 1
For each harness, spin up a subagent in parallel to study each harness carefully and write a file about the harness.
1. What is the recommended flow / flows of each system?  Which agents should I call for what purpose and in what order?  These harnesses have workflows geared towards updating the packages themselves.  Focus instead on the workflow(s) that the harness recommends I use when I use them for my own coding on another project.
2. Do the agents create artifacts as part of their workflow?  And where do the artifacts go in the repo?  Which agent writes them?  Which agent is responsible for reading them?
3. For each agent in the harness, what does each agent do?  Which agents call which other agents? What gets put into separate subagent vs main agent?  Draw mermaid diagrams for this to help explain
4. What is handled by LLM prompts vs skill vs command vs code (e.g. *.ts files).

### General Advice
- Back up your claims with github links to the original code prompts at a frozen git hash..
- Think deeply before writing.
- Draw mermaid diagrams to help explain this.

## Step 2
For each harness, spin up a separate harness but in parallel to verify the facts by checking the links / repo
1. Check the github links and verify each of the claims.
2. Don't edit the document, just push back and return the issues back to the orchestrator

## Step 3
Send the feedback from Step 2 to the corresponding agent in Step 1 and ask it to fix the issues.  Repeat until all major issues are resolved and only minor issues remain.

**ALWAYS SPIN UP A SUBAGENT PER HARNESS IN STEPS 1 and 2 IN PARALLEL**