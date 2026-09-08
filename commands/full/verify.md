---
description: Run full integration review and completion gate
agent: verifier
subagent: true
---

Load `final-verification`. After every task has a PASS review, create only the active stage's verification evidence and complete it through the controller. The controller dispatches the next non-human verification stage automatically.
