---
description: Explicitly approve product design and open the architecture stage
agent: build
subagent: false
---

Treat this command invocation as the user's explicit Product Design Human Gate approval.

Read `.workflow/state.json`, the feature specification, `DESIGN.md`, refined user flow, wireframes, screen explorations, component guidance, design critique, and traceability. Approval is valid only from `PRODUCT_REVIEW`. Verify that artifacts exist, stable requirement IDs are used, acceptance criteria are observable, relevant states/interactions are defined, and requirements are represented in the Open Design outputs where applicable.

If a material gap or unresolved product decision remains, do not approve; list the gap and recommend `/design <requested changes>`. Otherwise call `workflow_approve` with `gate: "product_design"` and `dispatch: true`. Do not edit `.workflow/state.json`, create architecture, or change source in this command. The controller launches the architecture worker session. Recommend `/plan` next only if the user prefers to plan interactively.
