---
name: bug-analysis
description: Diagnose a defect through reproducible evidence, root-cause analysis, affected-scope mapping, and regression planning
compatibility: opencode
metadata:
  workflow-stage: bugfix
---

# Bug analysis

For a `bugfix` workflow, keep implementation separate from diagnosis.

1. Write `.workflow/requirements/bug-report.md` with symptoms, environment, expected and actual behavior, impact, and a stable bug ID.
2. Write `.workflow/reviews/reproduction.md` with deterministic reproduction steps and observed evidence.
3. Write `.workflow/architecture/root-cause.md` with hypotheses, evidence, confirmed cause, and rejected causes.
4. Write `.workflow/architecture/affected-scope.md` mapping affected code, data, APIs, users, and regression risks.
5. Write `.workflow/tasks/regression-tests.md` before the fix, including the RED reproduction test and wider regression checks.

If the cause is unclear, data could be lost, a migration is needed, or the correct fix is a product/architecture choice, call `workflow_request_human_review` with the concrete decision needed. Do not change product source until the `FIX` stage.
