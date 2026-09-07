---
description: Explicitly skip the current non-gate workflow stage with an audit reason
agent: plan
subagent: false
---

Treat invocation of this command as the user's explicit confirmation to skip only the current stage. Read workflow status, take `$ARGUMENTS` as the required concrete reason, and call `workflow_skip_stage` exactly once with the exact current stage, reason, and `confirmedByUser: true`.

Do not skip a human gate, terminal stage, or a stage other than the current one. Report the `SKIPPED` stage, preserved reason, next stage, and any gate now waiting. If the reason is empty, stop and request one without changing state.
