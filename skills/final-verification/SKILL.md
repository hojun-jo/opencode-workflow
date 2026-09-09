---
name: final-verification
description: Perform release-level verification of requirement coverage, integration, regression, architecture, documentation, and unresolved decisions
compatibility: opencode
metadata:
  workflow-stage: final-review
---

# Final verification

Run only after every task is `done` and all task reviews are `PASS`.

The active artifact root is `workflow.artifact_root` in `.workflow/state.json`; all artifact paths below are relative to it.

Verify:

- Every requirement and acceptance criterion has implementation and test/review evidence.
- Integration paths and critical user flows work end to end.
- Regression, build, static analysis, and relevant test suites pass with observed output.
- Implementation remains consistent with architecture and ADRs.
- Documentation and traceability match shipped behavior.
- There are no unresolved decisions, skipped tasks, uncovered requirements, or unacknowledged risks.

At `INTEGRATION_REVIEW`, write `reviews/integration.md`. At `COMPLETION_GATE`, write `reviews/final.md`. Each artifact must record commands, results, coverage gaps, residual risks, and exactly one decision.

- `PASS`: call `workflow_complete_stage` for the active stage only; the controller dispatches `COMPLETION_GATE` after an integration pass.
- `FIX_REQUIRED`: identify affected tasks/requirements and return the work to a bounded build task.
- `HUMAN_REQUIRED`: call `workflow_request_human_review` with the exact decision required.
