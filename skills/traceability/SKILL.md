---
name: traceability
description: Maintain requirement-to-design-to-architecture-to-task-to-test-to-review evidence with explicit coverage gaps
compatibility: opencode
metadata:
  workflow-stage: traceability-check
---

# Traceability

The active artifact root is `workflow.artifact_root` in `.workflow/state.json`. Update its `traceability.json` without changing workflow state. Every requirement or bug ID must reference relevant design, architecture, tasks, tests, and review evidence. Use explicit empty arrays or a documented `not_applicable` rationale; never imply coverage.

Before `TRACEABILITY_CHECK` completes, report uncovered IDs, orphan tasks, missing acceptance criteria, and missing verification evidence. The controller validates the traceability artifact but never invents coverage.
