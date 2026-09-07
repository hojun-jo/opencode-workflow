---
description: Explicitly approve the active human gate in the managed workflow
agent: build
subagent: false
---

This command is an explicit human approval. Call `workflow_status`, then call `workflow_approve` for its `waiting_for_gate` with `dispatch: true`. The controller starts the next stage in a separate OMO-backed worker session. Do not edit `.workflow/state.json` directly. If no gate is waiting or required artifacts are missing, report the controller error and do not infer approval.
