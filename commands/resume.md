---
description: Inspect a managed workflow and resume its active stage safely
agent: plan
subagent: false
---

Call `workflow_status`. If it is waiting for `HUMAN_REVIEW`, call `workflow_continue` to record this explicit user resume; the controller restarts the active worker automatically. If it is waiting for a product-design or implementation-plan gate, stop and report the exact approval command. Otherwise report the active stage and direct the user to the corresponding phase command. Do not complete a running stage merely to advance it and do not edit files.
