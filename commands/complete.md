---
description: Run final integration and traceability verification before completion
agent: verifier
subagent: true
---

Perform final verification for the current project. Optional release focus: `$ARGUMENTS`.

Require every task to be `done` with a `PASS` review. Load `final-verification`, inspect all approved artifacts and traceability, and run proportionate integration, regression, build, static-analysis, and documentation checks using observed evidence.

Use the `workflow.artifact_root` from `.workflow/state.json`. Complete only the active verification stage. At `INTEGRATION_REVIEW`, write `reviews/integration.md` there and call `workflow_complete_stage`; the controller starts `COMPLETION_GATE` automatically. At `COMPLETION_GATE`, write `reviews/final.md` there and call `workflow_complete_stage`; only the controller can mark `COMPLETE`. Otherwise return `FIX_REQUIRED` or `HUMAN_REQUIRED` with the exact next action. Never edit product source, tests, or `.workflow/state.json` during final verification.
