export default {
  name: "quick",
  description: "A balanced requirement, light plan, task, TDD build, and review workflow with conditional human review.",
  stages: [
    { id: "REQUIREMENT", ponytail: "lite" },
    { id: "OPEN_DESIGN_LITE", ponytail: "lite" },
    { id: "LIGHT_PLAN", ponytail: "lite" },
    { id: "TASK_DEFINITION", ponytail: "lite" },
    { id: "BUILD", ponytail: "full" },
    { id: "TASK_REVIEW", ponytail: "full", ponytail_review: true },
    { id: "COMPLETE", terminal: true, ponytail: "off" },
  ],
};
