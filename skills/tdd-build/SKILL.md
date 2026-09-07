---
name: tdd-build
description: Implement exactly one approved workflow task using RED, GREEN, REFACTOR, and VERIFY with recorded evidence
compatibility: opencode
metadata:
  workflow-stage: build
---

# TDD build

Run only when the implementation-plan gate is approved.

## Entry checks

- Select the requested task or the first `ready` task.
- Confirm every dependency is `done`.
- Read only the linked requirements, acceptance criteria, relevant architecture, project rules, relevant source, and tests.
- Set the task to `in_progress` in `tasks.json` before source edits. The controller owns `current_task` and stage state.

## Cycle

1. **RED**: add or identify a test that fails for the intended reason; record the command and failure.
2. **GREEN**: make the smallest implementation that passes the target test.
3. **REFACTOR**: improve structure without changing behavior; do not expand scope.
4. **VERIFY**: run focused tests plus proportionate regression/static/build checks.

If an executable test is infeasible, explain why and use the task's explicit manual verification plan. Do not claim RED or PASS without observed evidence.

## Exit

- Synchronize affected documentation when the task requires it.
- Set task status to `review_ready`, then call `workflow_complete_stage` for `BUILD`; the controller moves to `TASK_REVIEW`.
- Record commands and outcomes in the task's TDD fields or workflow review context.
- Do not mark the task `done`; only an independent `PASS` review may do that.
