---
description: Create architecture and traceable implementation tasks, then stop at the plan gate
agent: build
model: openai/gpt-5.6-terra
subagent: false
---

Plan the approved feature. Optional focus: `$ARGUMENTS`.

Require `gates.product_design.status == approved`. If the current stage is `IMPLEMENTATION_REVIEW`, treat `$ARGUMENTS` as the required concrete revision request; if it is empty, ask the user for that request and stop. Call `workflow_reject` with `gate: "implementation_plan"` and that reason before editing artifacts; this returns the workflow to `TDD_PLAN`. Otherwise require stage `ARCHITECTURE`, `TASK_DECOMPOSITION`, `TRACEABILITY_CHECK`, or `TDD_PLAN`. Load only the active stage's skill: `architecture`, `task-planning`, `traceability`, or `tdd`.

Use the OMO Oracle for one read-only Sol consultation only when an architecture decision is hard to reverse, cross-cutting, security-sensitive, or costly to correct. Record it in `.workflow/architecture/oracle-consultation.md`; never use it for ordinary task decomposition. Do not edit product source, tests, or `.workflow/state.json`. Complete only the active planning stage; the controller dispatches each subsequent planning stage automatically and stops at `IMPLEMENTATION_REVIEW`. Recommend `/approve-plan` or `/plan <requested changes>`.
