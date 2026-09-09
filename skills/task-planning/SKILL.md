---
name: task-planning
description: Decompose approved requirements and architecture into dependency-safe, traceable, session-sized TDD tasks
compatibility: opencode
metadata:
  workflow-stage: task-planning
---

# Task planning

Run after architecture exists and before implementation approval. Complete only the active planning stage; the controller dispatches the next planning stage automatically.

The active artifact root is `workflow.artifact_root` in `.workflow/state.json`; all artifact paths below are relative to it.

At `TASK_DECOMPOSITION`, create `tasks/tasks.json` as an object with `schema_version: 1` and a `tasks` array. Every task must contain:

```json
{
  "id": "TASK-001",
  "title": "Short outcome",
  "requirement_ids": ["REQ-AREA-001"],
  "dependencies": [],
  "complexity": "small",
  "acceptance_criteria": ["Observable result"],
  "test_strategy": {
    "unit": [],
    "integration": [],
    "manual": []
  },
  "implementation_steps": {
    "red": [],
    "green": [],
    "refactor": [],
    "verify": []
  },
  "status": "ready"
}
```

Rules:

- Each task fits one focused build session and produces a reviewable outcome.
- Dependencies form an acyclic graph and refer only to existing task IDs.
- Tasks with incomplete dependencies start `blocked`; dependency-free tasks start `ready`.
- Acceptance criteria are specific and observable; verification names concrete commands or checks.
- Every requirement maps to at least one task and test strategy. Do not create orphan tasks.
- Architecture changes are not hidden inside tasks. Return to architecture if a missing decision is discovered.

At `TASK_DECOMPOSITION`, write the task file. At `TRACEABILITY_CHECK`, update traceability. At `TDD_PLAN`, write `tasks/tdd-plan.md`. Do not edit workflow state; call `workflow_complete_stage` once for the active stage and do not call `workflow_dispatch`.
