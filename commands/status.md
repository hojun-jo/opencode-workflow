---
description: Show controller-owned workflow state and the next permitted action
agent: plan
subagent: false
---

Call `workflow_status` now. Do not edit files. Report its profile, goal, stage, status, gates, missing artifacts, and the next permitted action.

Interpret a waiting status precisely:

- If `waiting_for_gate` is `HUMAN_REVIEW`, quote or summarize `human_review_reason`. Do not recommend a phase command such as `/build`, because it is intentionally blocked. Tell the user to finish that concrete human action, then run `/resume`; the controller redispatches the current stage automatically.
- If it is `product_design` or `implementation_plan`, report the exact approval command. Do not claim that `completion` is a human gate.
- If status is `running`, the controller has already dispatched (or will dispatch) the current worker automatically. Do not tell the user to enter the current phase command again.
- If status is `complete`, report completion without suggesting another command.
