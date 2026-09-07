---
description: Show current project workflow stage, gates, tasks, blockers, and next command
agent: plan
subagent: false
---

Call `workflow_status`. Do not edit anything.

Report the controller-owned stage, each stage status (`PENDING`, `RUNNING`, `COMPLETED`, `IMPORTED`, `SKIPPED`, or `INVALID`), active Ponytail mode and whether a Ponytail review/audit is applicable, artifact sources and validation warnings, each gate, current task, implementation coverage summary, missing artifacts, blockers, and the single most appropriate next command. If the workflow is not initialized, recommend `/workflow-init`.
