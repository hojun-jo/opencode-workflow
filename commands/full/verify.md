---
description: Run full integration review and completion gate
agent: verifier
subagent: true
---

Load `final-verification`. After every task has a PASS review, create integration and final evidence, then complete `INTEGRATION_REVIEW` and `COMPLETION_GATE` through the controller.
