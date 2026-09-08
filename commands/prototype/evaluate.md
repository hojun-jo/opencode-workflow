---
description: Evaluate a prototype and record KEEP, ITERATE, or DROP
agent: verifier
model: openai/gpt-5.6-terra
subagent: true
---

Run only after the user approves `PROTOTYPE_REVIEW`. Load `prototype-evaluation`. Compare observed evidence against success criteria and constraints, write the evaluation and decision artifacts, and complete `EVALUATE` then `DECISION`. For `KEEP`, recommend a new `quick` or `full` workflow rather than silently converting the prototype.
