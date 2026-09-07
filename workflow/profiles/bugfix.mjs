export default {
  name: "bugfix",
  description: "A root-cause and regression-first bugfix workflow with conditional human review.",
  stages: [
    { id: "BUG_REPORT", ponytail: "off" },
    { id: "REPRODUCE", ponytail: "off" },
    { id: "ROOT_CAUSE", ponytail: "lite" },
    { id: "AFFECTED_SCOPE", ponytail: "lite" },
    { id: "REGRESSION_TEST", ponytail: "full" },
    { id: "FIX", ponytail: "full" },
    { id: "REGRESSION_REVIEW", ponytail: "full", ponytail_review: true },
    { id: "DOCUMENTATION_CHECK", ponytail: "lite" },
    { id: "COMPLETE", terminal: true, ponytail: "off" },
  ],
};
