---
name: tdd
description: Plan and execute RED, GREEN, REFACTOR, and VERIFY evidence for bounded workflow tasks
compatibility: opencode
metadata:
  workflow-stage: tdd-plan
---

# TDD

The active artifact root is `workflow.artifact_root` in `.workflow/state.json`; all artifact paths below are relative to it. For every implementation task, document the intended RED test, minimal GREEN change, REFACTOR boundary, and VERIFY commands in `tasks/tdd-plan.md` or the task's `implementation_steps`.

During BUILD, observe and record each result. If executable automation is infeasible, record why and the concrete manual verification. Do not edit `.workflow/state.json`; call `workflow_complete_stage` when the bounded stage evidence is ready.
