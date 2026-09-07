---
name: final-verification
description: Perform release-level verification of requirement coverage, integration, regression, architecture, documentation, and unresolved decisions
compatibility: opencode
metadata:
  workflow-stage: final-review
---

# Final verification

Run only after every task is `done` and all task reviews are `PASS`.

Verify:

- Every requirement and acceptance criterion has implementation and test/review evidence.
- Integration paths and critical user flows work end to end.
- Regression, build, static analysis, and relevant test suites pass with observed output.
- Implementation remains consistent with architecture and ADRs.
- Documentation and traceability match shipped behavior.
- There are no unresolved decisions, skipped tasks, uncovered requirements, or unacknowledged risks.

Write `.workflow/reviews/integration.md` and `.workflow/reviews/final.md` with commands, results, coverage gaps, residual risks, and exactly one decision.

- `PASS`: call `workflow_complete_stage` for `INTEGRATION_REVIEW`, then `COMPLETION_GATE`.
- `FIX_REQUIRED`: identify affected tasks/requirements and return the work to a bounded build task.
- `HUMAN_REQUIRED`: call `workflow_request_human_review` with the exact decision required.
