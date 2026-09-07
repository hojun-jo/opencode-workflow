---
name: prototype-evaluation
description: Evaluate a prototype against explicit success criteria and record KEEP, ITERATE, or DROP without turning it into production scope
compatibility: opencode
metadata:
  workflow-stage: prototype
---

# Prototype evaluation

Write constraints to `.workflow/prototypes/constraints.md`, observed measurements and findings to `.workflow/prototypes/evaluation.md`, and exactly one decision to `.workflow/prototypes/decision.md`: `KEEP`, `ITERATE`, or `DROP`.

`KEEP` must name the recommended next workflow (`quick` or `full`); `ITERATE` must identify the next hypothesis; `DROP` must explain why success criteria failed. Avoid speculative architecture and production-hardening unless required to test the hypothesis.
