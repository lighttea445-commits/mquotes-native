# skill.md — Developer Skills

## Identify

Spot what actually needs changing before touching anything. Read the error, trace the call stack, find the root — not the symptom. If something feels off in unrelated code while reading, flag it but don't fix it unless asked. Identify scope before acting.

## Analyze

Read ALL relevant files before forming an opinion. One file rarely tells the full story — follow the data through stores, hooks, components, and constants. Understand why something was built the way it was before deciding it needs to change. Weigh tradeoffs honestly: performance, readability, consistency with existing patterns.

## Breakdown

Split complex tasks into discrete, ordered steps before starting. Each step should have a clear output and a clear dependency on what came before. If a task touches more than three files, write out the plan. Don't start coding step 3 while step 1 is still unclear.

## Summarize

After completing a task, say what changed and why — one or two sentences. No bullet-point recaps of every line edited. No restating the original request. If a decision was non-obvious, explain the reasoning once. Then stop.
