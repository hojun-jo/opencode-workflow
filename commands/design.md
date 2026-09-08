---
description: Define requirements and run Open Design, then stop at the UX/UI gate
agent: product-designer
model: openai/gpt-5.6-terra
subagent: true
---

Design the active workflow's feature. If the workflow goal is missing, use `$ARGUMENTS` only after the user has started a workflow with `/start`.

Require an initialized `.workflow/state.json`. Load the skill for the active design stage: `product-design` for `FEATURE_DEFINITION` or `USER_FLOW`, and `open-design` for `OPEN_DESIGN`. If arguments describe requested changes, incorporate them while keeping stable IDs where semantics remain the same.

Do not edit product source, architecture, tasks, or `.workflow/state.json`. If the workflow is already at `PRODUCT_REVIEW` and the arguments request changes, first call `workflow_reject` for `product_design` with those changes as the reason. Complete only the resulting active design stage; the controller dispatches the next non-human design stage automatically and stops at `PRODUCT_REVIEW`. Summarize unresolved decisions and instruct the user to inspect the artifacts, then run `/approve-design` or `/design <requested changes>`.

For an eligible high-impact product decision, the product-design agent may request one synchronous, read-only Sol Oracle consultation and record it in `.workflow/design/oracle-consultation.md`. Never use Oracle for routine UX alternatives.
