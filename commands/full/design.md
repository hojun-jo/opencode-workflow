---
description: Run the full workflow product-design lane through its first human gate
agent: product-designer
subagent: true
---

Load `product-design` for the feature specification and initial user flow, then load `open-design` for flow validation, wireframes, screen exploration, interaction/state definitions, design-system guidance, critique, and traceability. Do not change product source. If already at `PRODUCT_REVIEW` with requested changes, first call `workflow_reject` for `product_design`, then revise and complete `OPEN_DESIGN`. Otherwise complete only the current and subsequent stages among `FEATURE_DEFINITION`, `USER_FLOW`, and `OPEN_DESIGN` in order. Stop at `PRODUCT_REVIEW`.
