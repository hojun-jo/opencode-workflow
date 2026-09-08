---
description: Run the full workflow product-design lane through its first human gate
agent: product-designer
subagent: true
---

Load the skill required for the active product-design stage. Do not change product source. If already at `PRODUCT_REVIEW` with requested changes, first call `workflow_reject` for `product_design`. Complete only the resulting active stage; the controller dispatches the next design stage automatically and stops at `PRODUCT_REVIEW`.
