---
description: Start the balanced quick workflow with automatic worker dispatch
agent: plan
subagent: false
---

Call `workflow_start` with `profile: "quick"`, the requested goal, and `dispatch: true`. Produce a compact `OPEN_DESIGN_LITE` decision record before light planning, then use TDD by default. Call `workflow_request_human_review` if requirements, UX direction, data/API impact, scope, or architecture needs a decision.
