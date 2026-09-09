---
name: bug-analysis
description: Diagnose a defect through reproducible evidence, root-cause analysis, affected-scope mapping, and regression planning
compatibility: opencode
metadata:
  workflow-stage: bugfix
---

# Bug analysis

For a `bugfix` workflow, keep implementation separate from diagnosis.

The active artifact root is `workflow.artifact_root` in `.workflow/state.json`; all artifact paths below are relative to it.

At `BUG_REPORT`, write `requirements/bug-report.md` with symptoms, environment, expected and actual behavior, impact, and a stable bug ID. At `REPRODUCE`, write `reviews/reproduction.md` with deterministic reproduction steps and observed evidence. At `ROOT_CAUSE`, write `architecture/root-cause.md` with hypotheses, evidence, confirmed cause, and rejected causes. At `AFFECTED_SCOPE`, write `architecture/affected-scope.md` mapping affected code, data, APIs, users, and regression risks. At `REGRESSION_TEST`, write `tasks/regression-tests.md` before the fix, including the RED reproduction test and wider regression checks.

If the cause is unclear, data could be lost, a migration is needed, or the correct fix is a product/architecture choice, call `workflow_request_human_review` with the concrete decision needed. Do not change product source until the `FIX` stage. Complete only the active stage with `workflow_complete_stage`; the controller dispatches the next non-human stage automatically.
