import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { getProfile } from "./profiles/index.mjs";
import {
  analyzeExistingImplementation,
  approveGate,
  completeStage,
  inspectExistingWorkflow,
  readWorkflow,
  rejectGate,
  requestHumanReview,
  skipStage,
  startWorkflow,
  workflowStatus,
} from "./engine.mjs";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "opencode-workflow-"));
  return {
    directory,
    artifact(relativePath, content = "evidence\n") {
      const path = join(directory, ".workflow", relativePath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, "utf8");
    },
    projectFile(relativePath, content = "evidence\n") {
      const path = join(directory, relativePath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, "utf8");
    },
    cleanup() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function complete(directory, stage) {
  return completeStage(directory, { stage, summary: `${stage} verified` });
}

test("full profile uses Open Design artifacts and both human gates", () => {
  const work = fixture();
  try {
    let state = startWorkflow(work.directory, { profile: "full", goal: "Open Design full test" });
    assert.equal(state.schema_version, 4);
    assert.equal(state.stage, "FEATURE_DEFINITION");
    assert.equal(workflowStatus(work.directory).ponytail.mode, "off");

    work.artifact("requirements/feature-spec.md");
    complete(work.directory, "FEATURE_DEFINITION");
    work.artifact("design/user-flow.md");
    complete(work.directory, "USER_FLOW");

    work.artifact("design/DESIGN.md");
    work.artifact("design/wireframes/main.md");
    work.artifact("design/screens/main.md");
    work.artifact("design/component-guidelines.md");
    work.artifact("design/design-review.md");
    state = complete(work.directory, "OPEN_DESIGN");
    assert.equal(state.stage, "PRODUCT_REVIEW");
    assert.equal(state.workflow.status, "waiting_human");

    state = rejectGate(work.directory, { gate: "product_design", reason: "Revise the empty state" });
    assert.equal(state.stage, "OPEN_DESIGN");
    complete(work.directory, "OPEN_DESIGN");
    state = approveGate(work.directory, { gate: "product_design" });
    assert.equal(state.stage, "ARCHITECTURE");

    work.artifact("architecture/architecture.md");
    complete(work.directory, "ARCHITECTURE");
    work.artifact("tasks/tasks.json", JSON.stringify({ tasks: [{ id: "T-1", status: "done", review: "PASS" }] }));
    complete(work.directory, "TASK_DECOMPOSITION");
    complete(work.directory, "TRACEABILITY_CHECK");
    work.artifact("tasks/tdd-plan.md");
    complete(work.directory, "TDD_PLAN");
    state = rejectGate(work.directory, {
      gate: "implementation_plan",
      reason: "Split the oversized implementation plan into session-sized tasks",
    });
    assert.equal(state.stage, "TDD_PLAN");
    assert.equal(state.workflow.status, "running");
    complete(work.directory, "TDD_PLAN");
    state = approveGate(work.directory, { gate: "implementation_plan" });
    assert.equal(state.stage, "BUILD");
    assert.equal(workflowStatus(work.directory).ponytail.mode, "full");

    complete(work.directory, "BUILD");
    assert.deepEqual(workflowStatus(work.directory).missing_artifacts, [".workflow/reviews/ponytail-review.md"]);
    work.artifact("reviews/ponytail-review.md", "Lean already. Ship.\n");
    complete(work.directory, "TASK_REVIEW");
    work.artifact("reviews/integration.md");
    complete(work.directory, "INTEGRATION_REVIEW");
    assert.deepEqual(workflowStatus(work.directory).ponytail, {
      mode: "full",
      review_required: false,
      audit: "optional",
    });
    work.artifact("reviews/final.md");
    state = complete(work.directory, "COMPLETION_GATE");
    assert.equal(state.stage, "COMPLETE");
    assert.equal(state.workflow.status, "complete");
  } finally {
    work.cleanup();
  }
});

test("quick profile requires Open Design Lite before planning", () => {
  const work = fixture();
  try {
    startWorkflow(work.directory, { profile: "quick", goal: "Open Design lite test" });
    work.artifact("requirements/feature-spec.md");
    complete(work.directory, "REQUIREMENT");
    assert.equal(readWorkflow(work.directory).stage, "OPEN_DESIGN_LITE");
    assert.deepEqual(workflowStatus(work.directory).missing_artifacts, [".workflow/design/DESIGN.md"]);

    work.artifact("design/DESIGN.md");
    complete(work.directory, "OPEN_DESIGN_LITE");
    work.artifact("tasks/tasks.json", JSON.stringify({ tasks: [{ id: "T-1", status: "done", review: "PASS" }] }));
    complete(work.directory, "LIGHT_PLAN");
    complete(work.directory, "TASK_DEFINITION");
    complete(work.directory, "BUILD");
    work.artifact("reviews/ponytail-review.md", "Lean already. Ship.\n");
    const state = complete(work.directory, "TASK_REVIEW");
    assert.equal(state.workflow.status, "complete");
  } finally {
    work.cleanup();
  }
});

test("bugfix profile continues to skip Open Design", () => {
  const work = fixture();
  try {
    startWorkflow(work.directory, { profile: "bugfix", goal: "Bugfix test" });
    const stages = [
      ["BUG_REPORT", "requirements/bug-report.md"],
      ["REPRODUCE", "reviews/reproduction.md"],
      ["ROOT_CAUSE", "architecture/root-cause.md"],
      ["AFFECTED_SCOPE", "architecture/affected-scope.md"],
      ["REGRESSION_TEST", "tasks/regression-tests.md"],
      ["FIX", "reviews/fix-verification.md"],
      ["REGRESSION_REVIEW", "reviews/regression-review.md"],
      ["DOCUMENTATION_CHECK", "reviews/documentation-check.md"],
    ];
    for (const [stage, artifact] of stages) {
      work.artifact(artifact);
      if (stage === "REGRESSION_REVIEW") work.artifact("reviews/ponytail-review.md", "Lean already. Ship.\n");
      complete(work.directory, stage);
    }
    const state = readWorkflow(work.directory);
    assert.equal(state.stage, "COMPLETE");
    assert.equal(state.workflow.status, "complete");
  } finally {
    work.cleanup();
  }
});

test("prototype uses focused Open Design and an automatic build-review-evaluation path", () => {
  const work = fixture();
  try {
    startWorkflow(work.directory, { profile: "prototype", goal: "Prototype test" });
    assert.equal(getProfile("prototype").stages.find((stage) => stage.id === "PROTOTYPE_REVIEW")?.gate, undefined);
    work.artifact("requirements/feature-spec.md");
    complete(work.directory, "GOAL");
    work.artifact("requirements/success-criteria.md");
    complete(work.directory, "SUCCESS_CRITERIA");
    work.artifact("prototypes/constraints.md");
    complete(work.directory, "CONSTRAINTS");
    work.artifact("design/user-flow.md");
    complete(work.directory, "USER_FLOW");
    work.artifact("design/DESIGN.md");
    work.artifact("design/wireframes/prototype.md");
    work.artifact("design/screens/prototype.md");
    complete(work.directory, "OPEN_DESIGN");
    assert.throws(() => complete(work.directory, "BUILD"), /prototypes\/build\.md/);
    work.artifact("prototypes/build.md");
    let state = complete(work.directory, "BUILD");
    assert.equal(state.stage, "PROTOTYPE_REVIEW");
    assert.equal(state.workflow.status, "running");
    assert.deepEqual(workflowStatus(work.directory).missing_artifacts, [".workflow/reviews/prototype-review.md"]);

    work.artifact("reviews/prototype-review.md");
    state = complete(work.directory, "PROTOTYPE_REVIEW");
    assert.equal(state.stage, "EVALUATE");
    work.artifact("prototypes/evaluation.md");
    complete(work.directory, "EVALUATE");
    work.artifact("prototypes/decision.md", "KEEP\n");
    state = complete(work.directory, "DECISION");
    assert.equal(state.workflow.status, "complete");
  } finally {
    work.cleanup();
  }
});

test("workflow status separates a dynamic human review from pending future gates", () => {
  const work = fixture();
  try {
    startWorkflow(work.directory, { profile: "full", goal: "Human review status test" });
    requestHumanReview(work.directory, { reason: "Connect the physical device and complete offline validation." });

    const status = workflowStatus(work.directory);
    assert.equal(status.waiting_for_gate, "HUMAN_REVIEW");
    assert.equal(status.human_review_reason, "Connect the physical device and complete offline validation.");
    assert.notEqual(status.waiting_for_gate, "completion");
  } finally {
    work.cleanup();
  }
});

test("legacy prototype review waits migrate to an automatic review stage", () => {
  const work = fixture();
  try {
    startWorkflow(work.directory, { profile: "prototype", goal: "Prototype migration test" });
    work.artifact("state.json", JSON.stringify({
      schema_version: 4,
      workflow: { profile: "prototype", goal: "Prototype migration test", status: "waiting_human", started_at: null },
      stage: "PROTOTYPE_REVIEW",
      gates: { prototype_review: { status: "pending", approved_at: null } },
    }));
    const state = readWorkflow(work.directory);
    assert.equal(state.stage, "PROTOTYPE_REVIEW");
    assert.equal(state.workflow.status, "running");
  } finally {
    work.cleanup();
  }
});

test("legacy design stage names normalize to Open Design", () => {
  for (const [profile, legacyStage] of [["full", "WIREFRAME"], ["prototype", "MINIMAL_DESIGN"]]) {
    const work = fixture();
    try {
      startWorkflow(work.directory, { profile, goal: "Migration test" });
      work.artifact("state.json", JSON.stringify({
        schema_version: 2,
        workflow: { profile, goal: "Migration test", status: "running", started_at: null },
        stage: legacyStage,
      }));
      const state = readWorkflow(work.directory);
      assert.equal(state.schema_version, 4);
      assert.equal(state.stage, "OPEN_DESIGN");
    } finally {
      work.cleanup();
    }
  }
});

test("brownfield inspection recommends architecture after validated design artifacts", () => {
  const work = fixture();
  try {
    work.artifact("requirements/feature-spec.md", "# Requirements\nREQ-AUTH-001 Login\n");
    work.artifact("design/user-flow.md", "# User flow\nLogin to dashboard with recovery flow.\n");
    work.artifact("design/DESIGN.md", "# Design\nInteraction behavior covers loading, empty, and error states.\n");
    work.artifact("design/wireframes/main.md", "# Main wireframe\nScreen structure.\n");
    work.artifact("design/screens/main.md", "# Main screen\nVisual direction.\n");
    work.artifact("design/component-guidelines.md", "# Components\nReusable component rules.\n");
    work.artifact("design/design-review.md", "# Review\nPASS with evidence and requirement links.\n");
    work.artifact("traceability.json", JSON.stringify({ requirements: [{ id: "REQ-AUTH-001" }] }));

    const inspection = inspectExistingWorkflow(work.directory, { profile: "full" });
    assert.equal(inspection.recommended_from, "architecture");
    assert.equal(inspection.recommended_stage, "ARCHITECTURE");
    assert.deepEqual(inspection.required_gates, ["product_design"]);
    assert.equal(inspection.stages.OPEN_DESIGN.status, "IMPORT_WITH_WARNINGS");
  } finally {
    work.cleanup();
  }
});

test("brownfield start imports prior stages but stops at an unverified human gate", () => {
  const work = fixture();
  try {
    work.artifact("requirements/feature-spec.md", "# Requirements\nREQ-AUTH-001 Login\n");
    work.artifact("design/user-flow.md", "# User flow\nLogin to dashboard with recovery flow.\n");
    work.artifact("design/DESIGN.md", "# Design\nInteraction behavior covers loading, empty, and error states.\n");
    work.artifact("design/wireframes/main.md", "# Main wireframe\nScreen structure.\n");
    work.artifact("design/screens/main.md", "# Main screen\nVisual direction.\n");
    work.artifact("design/component-guidelines.md", "# Components\nReusable component rules.\n");
    work.artifact("design/design-review.md", "# Review\nPASS with evidence and requirement links.\n");
    work.artifact("traceability.json", JSON.stringify({ requirements: [{ id: "REQ-AUTH-001" }] }));

    let state = startWorkflow(work.directory, { profile: "full", goal: "Continue existing product", from: "architecture" });
    assert.equal(state.stage, "PRODUCT_REVIEW");
    assert.equal(state.workflow.status, "waiting_human");
    assert.equal(state.stages.FEATURE_DEFINITION.status, "IMPORTED");
    assert.equal(state.stages.OPEN_DESIGN.status, "IMPORTED");
    assert.equal(state.import.status, "BLOCKED");
    assert.equal(state.import.blocker.type, "GATE_REQUIRED");
    state = approveGate(work.directory, { gate: "product_design" });
    assert.equal(state.stage, "ARCHITECTURE");
    assert.equal(state.import.blocker, null);
  } finally {
    work.cleanup();
  }
});

test("explicitly verified imported gate permits architecture start", () => {
  const work = fixture();
  try {
    work.artifact("requirements/feature-spec.md", "# Requirements\nREQ-AUTH-001 Login\n");
    work.artifact("design/user-flow.md", "# User flow\nLogin to dashboard with recovery flow.\n");
    work.artifact("design/DESIGN.md", "# Design\nInteraction behavior covers loading, empty, and error states.\n");
    work.artifact("design/wireframes/main.md", "# Main wireframe\nScreen structure.\n");
    work.artifact("design/screens/main.md", "# Main screen\nVisual direction.\n");
    work.artifact("design/component-guidelines.md", "# Components\nReusable component rules.\n");
    work.artifact("design/design-review.md", "# Review\nPASS with evidence and requirement links.\n");
    work.artifact("traceability.json", JSON.stringify({ requirements: [{ id: "REQ-AUTH-001" }] }));

    const state = startWorkflow(work.directory, {
      profile: "full",
      goal: "Continue approved product",
      from: "architecture",
      verifiedGates: ["product_design"],
    });
    assert.equal(state.stage, "ARCHITECTURE");
    assert.equal(state.workflow.status, "running");
    assert.equal(state.gates.product_design.status, "satisfied");
    assert.equal(state.stages.PRODUCT_REVIEW.approval, "VERIFIED_BY_USER");
  } finally {
    work.cleanup();
  }
});

test("invalid imported evidence falls back to the earliest repair stage", () => {
  const work = fixture();
  try {
    work.artifact("requirements/feature-spec.md", "# Requirements\nREQ-AUTH-001 Login\n");
    const state = startWorkflow(work.directory, {
      profile: "full",
      goal: "Do not bypass missing design",
      from: "architecture",
      verifiedGates: ["product_design"],
    });
    assert.equal(state.stage, "USER_FLOW");
    assert.equal(state.stages.USER_FLOW.status, "INVALID");
    assert.equal(state.import.status, "BLOCKED");
    assert.equal(state.import.blocker.type, "INVALID_ARTIFACTS");
  } finally {
    work.cleanup();
  }
});

test("implementation analysis records DONE, PARTIAL, and NOT_IMPLEMENTED coverage", () => {
  const work = fixture();
  try {
    work.artifact("requirements/feature-spec.md", [
      "REQ-AUTH-001 login",
      "REQ-AUTH-002 logout",
      "REQ-AUTH-003 recovery",
    ].join("\n"));
    work.projectFile("src/auth.ts", "// REQ-AUTH-001\n// REQ-AUTH-002\nexport const auth = true;\n");
    work.projectFile("tests/auth.test.ts", "// REQ-AUTH-001\nexport const tested = true;\n");
    const analysis = analyzeExistingImplementation(work.directory);
    assert.deepEqual(analysis.coverage.map(({ requirement, status }) => [requirement, status]), [
      ["REQ-AUTH-001", "DONE"],
      ["REQ-AUTH-002", "PARTIAL"],
      ["REQ-AUTH-003", "NOT_IMPLEMENTED"],
    ]);
  } finally {
    work.cleanup();
  }
});

test("a human can approve valid external imported design evidence", () => {
  const work = fixture();
  try {
    work.projectFile("docs/prd.md", "# PRD\nREQ-AUTH-001 login requirement with acceptance criteria.\n");
    work.projectFile("docs/user-flow.md", "# User flow\nLogin, recovery, success, and failure paths.\n");
    work.projectFile("docs/design.md", "# Design\nScreens, interaction, loading, empty, and error states.\n");
    let state = startWorkflow(work.directory, {
      profile: "full",
      goal: "Import external product evidence",
      from: "architecture",
      sources: [
        { stage: "FEATURE_DEFINITION", source: "docs/prd.md" },
        { stage: "USER_FLOW", source: "docs/user-flow.md" },
        { stage: "OPEN_DESIGN", source: "docs/design.md" },
      ],
    });
    assert.equal(state.stage, "PRODUCT_REVIEW");
    assert.equal(state.stages.OPEN_DESIGN.status, "IMPORTED");
    state = approveGate(work.directory, { gate: "product_design" });
    assert.equal(state.stage, "ARCHITECTURE");
    assert.equal(state.gates.product_design.status, "approved");
  } finally {
    work.cleanup();
  }
});

test("empty traceability blocks a requested build start", () => {
  const work = fixture();
  try {
    work.projectFile("docs/all-evidence.md", "# Evidence\nREQ-AUTH-001 approved product, design, architecture, tasks, and TDD plan.\n");
    const stages = ["FEATURE_DEFINITION", "USER_FLOW", "OPEN_DESIGN", "ARCHITECTURE", "TASK_DECOMPOSITION", "TDD_PLAN"];
    const state = startWorkflow(work.directory, {
      profile: "full",
      goal: "Preserve traceability quality gate",
      from: "build",
      verifiedGates: ["product_design", "implementation_plan"],
      sources: stages.map((stage) => ({ stage, source: "docs/all-evidence.md" })),
    });
    assert.equal(state.stage, "TRACEABILITY_CHECK");
    assert.equal(state.stages.TRACEABILITY_CHECK.status, "INVALID");
    assert.equal(state.import.status, "BLOCKED");
  } finally {
    work.cleanup();
  }
});

test("an explicitly confirmed non-gate skip is audited as SKIPPED", () => {
  const work = fixture();
  try {
    startWorkflow(work.directory, { profile: "bugfix", goal: "Skip an inapplicable reproduction" });
    work.artifact("requirements/bug-report.md", "# Bug\nEnvironment cannot reproduce a retired integration.\n");
    complete(work.directory, "BUG_REPORT");
    assert.throws(
      () => skipStage(work.directory, { stage: "REPRODUCE", reason: "Integration retired" }),
      /explicit user confirmation/,
    );
    const state = skipStage(work.directory, {
      stage: "REPRODUCE",
      reason: "The affected integration has been retired and reproduction is not applicable.",
      confirmedByUser: true,
    });
    assert.equal(state.stages.REPRODUCE.status, "SKIPPED");
    assert.equal(state.stage, "ROOT_CAUSE");
    assert.equal(state.history.at(-1).event, "stage_skipped");
  } finally {
    work.cleanup();
  }
});

test("profiles assign Ponytail only where workflow work benefits from it", () => {
  const modes = (profile) => Object.fromEntries(getProfile(profile).stages.map((stage) => [stage.id, stage.ponytail]));
  assert.deepEqual(modes("full"), {
    FEATURE_DEFINITION: "off", USER_FLOW: "off", OPEN_DESIGN: "off", PRODUCT_REVIEW: "off",
    ARCHITECTURE: "lite", TASK_DECOMPOSITION: "lite", TRACEABILITY_CHECK: "lite", TDD_PLAN: "lite",
    IMPLEMENTATION_REVIEW: "lite", BUILD: "full", TASK_REVIEW: "full", INTEGRATION_REVIEW: "full",
    COMPLETION_GATE: "full", COMPLETE: "off",
  });
  assert.equal(modes("quick").BUILD, "full");
  assert.equal(modes("quick").LIGHT_PLAN, "lite");
  assert.equal(modes("bugfix").REPRODUCE, "off");
  assert.equal(modes("bugfix").ROOT_CAUSE, "lite");
  assert.equal(modes("bugfix").FIX, "full");
  assert.equal(modes("prototype").OPEN_DESIGN, "full");
  assert.equal(modes("prototype").BUILD, "full");
});
