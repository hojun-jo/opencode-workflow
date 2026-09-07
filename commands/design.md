---
description: Define requirements and run Open Design, then stop at the UX/UI gate
agent: product-designer
model: openai/gpt-5.6-terra
subagent: true
---

Design the active workflow's feature. If the workflow goal is missing, use `$ARGUMENTS` only after the user has started a workflow with `/start`.

Require an initialized `.workflow/state.json`. Load `product-design` for the feature specification and initial user flow, then load `open-design` for flow validation, wireframes, screen exploration, interaction/state definitions, design-system guidance, critique, and traceability. If arguments describe requested changes, incorporate them while keeping stable IDs where semantics remain the same.

Do not edit product source, architecture, tasks, or `.workflow/state.json`. If the workflow is already at `PRODUCT_REVIEW` and the arguments request changes, first call `workflow_reject` for `product_design` with those changes as the reason; revise `OPEN_DESIGN` and complete that stage again. Otherwise complete only the current and subsequent product-design stages in profile order: `FEATURE_DEFINITION`, `USER_FLOW`, `OPEN_DESIGN`. The controller validates artifacts and enters `PRODUCT_REVIEW`. Summarize unresolved decisions and instruct the user to inspect the artifacts, then run `/approve-design` or `/design <requested changes>`.
