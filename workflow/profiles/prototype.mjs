export default {
  name: "prototype",
  description: "A speed-oriented goal, open-design, prototype build, human review, and keep/iterate/drop workflow.",
  stages: [
    { id: "GOAL", ponytail: "off" },
    { id: "SUCCESS_CRITERIA", ponytail: "off" },
    { id: "CONSTRAINTS", ponytail: "off" },
    { id: "USER_FLOW", ponytail: "off" },
    { id: "OPEN_DESIGN", ponytail: "full" },
    { id: "BUILD", ponytail: "full" },
    { id: "PROTOTYPE_REVIEW", gate: "prototype_review", ponytail: "full" },
    { id: "EVALUATE", ponytail: "lite" },
    { id: "DECISION", ponytail: "lite" },
    { id: "COMPLETE", terminal: true, ponytail: "off" },
  ],
};
