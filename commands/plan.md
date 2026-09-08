---
description: Create architecture and traceable implementation tasks, then stop at the plan gate
agent: build
model: openai/gpt-5.6-terra
subagent: false
---

Plan the approved feature. Optional focus: `$ARGUMENTS`.

Require `gates.product_design.status == approved`. If the current stage is `IMPLEMENTATION_REVIEW`, treat `$ARGUMENTS` as the required concrete revision request; if it is empty, ask the user for that request and stop. Call `workflow_reject` with `gate: "implementation_plan"` and that reason before editing artifacts; this returns the workflow to `TDD_PLAN`. Otherwise require stage `ARCHITECTURE`, `TASK_DECOMPOSITION`, `TRACEABILITY_CHECK`, or `TDD_PLAN`. Load `architecture`, inspect the existing codebase, and create or revise the architecture and any necessary ADRs. Then load `task-planning`, create dependency-safe session-sized tasks, traceability evidence, and the TDD plan.

Use `openai/gpt-5.6-sol` through the OMO Oracle for a read-only consultation when a decision is hard to reverse, cross-cutting, security-sensitive, or costly to correct. Do not edit product source, tests, or `.workflow/state.json`. Complete each active planning stage in order; after a gate rejection, revise the affected artifacts and complete `TDD_PLAN` to return to `IMPLEMENTATION_REVIEW`. Recommend `/approve-plan` or `/plan <requested changes>`.
