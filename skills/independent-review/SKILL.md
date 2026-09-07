---
name: independent-review
description: Review a built task independently against requirements, architecture, tests, diff, edge cases, and scope
compatibility: opencode
metadata:
  workflow-stage: task-review
---

# Independent task review

Review the current `review_ready` or `fix_required` task without editing product source.

Inspect:

- Linked requirements and acceptance criteria
- Architecture and applicable ADRs
- Task definition and dependencies
- Actual diff and relevant source, not builder commentary
- Tests and observed test/build/static-analysis results
- Documentation changes and traceability

Check correctness, edge cases, error paths, security/privacy risk, architecture consistency, test quality, regressions, documentation, and scope creep.

Write `.workflow/reviews/<TASK-ID>.md` with findings ordered by severity, evidence, verification run, residual risk, and exactly one decision:

- `PASS`: requirements and acceptance criteria are met with adequate evidence. Set task `done`, clear `current_task`, unblock newly eligible tasks, and return stage to `BUILD` or `FINAL_REVIEW` when all tasks are done.
- `FIX_REQUIRED`: actionable implementation or test defects exist. Set task `fix_required`, retain `current_task`, and return stage to `BUILD`.
- `HUMAN_REQUIRED`: a product, security, data-loss, architecture, or scope choice cannot be resolved from approved artifacts. Set stage to `HUMAN_REVIEW` and preserve the task state.

Update traceability with review evidence. Never approve a task based only on passing tests.
