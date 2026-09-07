---
description: Explicitly approve the built prototype for evaluation
agent: build
subagent: false
---

Treat this command invocation as the user's explicit Prototype Review Human Gate approval. Require stage `PROTOTYPE_REVIEW`, inspect `.workflow/prototypes/build.md`, and confirm the prototype is available through the recorded launch/review instructions. Call `workflow_approve` with `gate: "prototype_review"` and `dispatch: true`. Do not edit `.workflow/state.json` or infer approval from prior feedback.
