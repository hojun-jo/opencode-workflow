---
name: prototype-evaluation
description: Evaluate a prototype against explicit success criteria and record KEEP, ITERATE, or DROP without turning it into production scope
compatibility: opencode
metadata:
  workflow-stage: prototype
---

# Prototype evaluation

The active artifact root is `workflow.artifact_root` in `.workflow/state.json`; all artifact paths below are relative to it. Complete only the active prototype stage. At `CONSTRAINTS`, write `prototypes/constraints.md`. At `EVALUATE`, write observed measurements and findings to `prototypes/evaluation.md`. At `DECISION`, write exactly one decision to `prototypes/decision.md`: `KEEP`, `ITERATE`, or `DROP`.

`KEEP` must name the recommended next workflow (`quick` or `full`); `ITERATE` must identify the next hypothesis; `DROP` must explain why success criteria failed. Avoid speculative architecture and production-hardening unless required to test the hypothesis. Call `workflow_complete_stage` only for the active stage; the controller dispatches the next non-human stage automatically.
