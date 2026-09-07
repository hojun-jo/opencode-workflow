---
description: Execute a bounded quick workflow task with TDD and independent review
agent: build
subagent: false
---

Require `BUILD`, load `tdd-build`, complete one ready task, and call `workflow_complete_stage` for `BUILD`. The controller dispatches independent review. Keep architecture lightweight unless a human review promotes the work to `full`.
