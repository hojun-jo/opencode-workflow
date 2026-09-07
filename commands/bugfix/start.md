---
description: Start a regression-first bugfix workflow with automatic worker dispatch
agent: plan
subagent: false
---

Call `workflow_start` with `profile: "bugfix"`, the reported defect, and `dispatch: true`. Diagnose and reproduce before any fix. Escalate using `workflow_request_human_review` for uncertain cause, data-loss risk, migrations, architecture redesign, or product tradeoffs.
