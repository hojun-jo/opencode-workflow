---
description: Create architecture and traceable implementation tasks, then stop at the plan gate
agent: build
model: openai/gpt-5.6-terra
subagent: false
---

Plan the approved feature. Optional focus: `$ARGUMENTS`.

Require `gates.product_design.status == approved` and stage `ARCHITECTURE`, `TASK_DECOMPOSITION`, `TRACEABILITY_CHECK`, or `TDD_PLAN`. Load `architecture`, inspect the existing codebase, and create the architecture and any necessary ADRs. Then load `task-planning`, create dependency-safe session-sized tasks, traceability evidence, and the TDD plan.

Use `openai/gpt-5.6-sol` through the OMO Oracle for a read-only consultation when a decision is hard to reverse, cross-cutting, security-sensitive, or costly to correct. Do not edit product source, tests, or `.workflow/state.json`. When artifacts are complete, call `workflow_complete_stage` in order for `ARCHITECTURE`, `TASK_DECOMPOSITION`, `TRACEABILITY_CHECK`, and `TDD_PLAN`; the controller will validate evidence and enter `IMPLEMENTATION_REVIEW`. Recommend `/approve-plan` or `/plan <requested changes>`.
