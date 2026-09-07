---
description: Explicitly approve architecture and task plan and open the build stage
agent: build
subagent: false
---

Treat this command invocation as the user's explicit Implementation Plan Human Gate approval.

Approval is valid only from `IMPLEMENTATION_REVIEW` with product design already approved. Validate architecture presence, task schema, dependency references and acyclicity, requirement-to-task-to-test coverage, observable acceptance criteria, and session-sized scope.

If a material gap remains, do not approve; report it and recommend `/plan <requested changes>`. Otherwise call `workflow_approve` with `gate: "implementation_plan"` and `dispatch: true`. Do not edit `.workflow/state.json` or implement in this command. The controller launches the build worker session.
