import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { getProfile, profiles } from "./profiles/index.mjs";

const directories = [
  "requirements",
  "design",
  "design/wireframes",
  "design/screens",
  "architecture/decisions",
  "tasks",
  "prototypes",
  "reviews",
];

const requiredArtifacts = {
  FEATURE_DEFINITION: ["requirements/feature-spec.md"],
  USER_FLOW: ["requirements/feature-spec.md", "design/user-flow.md"],
  OPEN_DESIGN: [
    "requirements/feature-spec.md",
    "design/DESIGN.md",
    "design/user-flow.md",
    "design/wireframes/",
    "design/screens/",
    "design/component-guidelines.md",
    "design/design-review.md",
    "traceability.json",
  ],
  OPEN_DESIGN_LITE: ["requirements/feature-spec.md", "design/DESIGN.md"],
  PRODUCT_REVIEW: [
    "requirements/feature-spec.md",
    "design/DESIGN.md",
    "design/user-flow.md",
    "design/wireframes/",
    "design/screens/",
    "design/component-guidelines.md",
    "design/design-review.md",
    "traceability.json",
  ],
  ARCHITECTURE: ["architecture/architecture.md"],
  TASK_DECOMPOSITION: ["architecture/architecture.md", "tasks/tasks.json"],
  TRACEABILITY_CHECK: ["traceability.json"],
  TDD_PLAN: ["tasks/tasks.json", "tasks/tdd-plan.md", "traceability.json"],
  IMPLEMENTATION_REVIEW: ["tasks/tasks.json", "tasks/tdd-plan.md", "traceability.json"],
  REQUIREMENT: ["requirements/feature-spec.md"],
  LIGHT_PLAN: ["tasks/tasks.json"],
  TASK_DEFINITION: ["tasks/tasks.json"],
  BUG_REPORT: ["requirements/bug-report.md"],
  REPRODUCE: ["reviews/reproduction.md"],
  ROOT_CAUSE: ["architecture/root-cause.md"],
  AFFECTED_SCOPE: ["architecture/affected-scope.md"],
  REGRESSION_TEST: ["tasks/regression-tests.md"],
  FIX: ["reviews/fix-verification.md"],
  TASK_REVIEW: ["reviews/ponytail-review.md"],
  REGRESSION_REVIEW: ["reviews/regression-review.md", "reviews/ponytail-review.md"],
  DOCUMENTATION_CHECK: ["reviews/documentation-check.md"],
  GOAL: ["requirements/feature-spec.md"],
  SUCCESS_CRITERIA: ["requirements/success-criteria.md"],
  CONSTRAINTS: ["prototypes/constraints.md"],
  PROTOTYPE_REVIEW: ["prototypes/build.md", "reviews/prototype-review.md"],
  EVALUATE: ["prototypes/evaluation.md"],
  DECISION: ["prototypes/decision.md"],
  INTEGRATION_REVIEW: ["reviews/integration.md", "traceability.json"],
  COMPLETION_GATE: ["reviews/final.md", "traceability.json"],
};

const gateFallbackStage = {
  product_design: "OPEN_DESIGN",
  implementation_plan: "TDD_PLAN",
};

const timestamp = () => new Date().toISOString();
const statePath = (directory) => join(directory, ".workflow", "state.json");
const traceabilityPath = (directory) => join(directory, ".workflow", "traceability.json");

function defaultGates() {
  return {
    product_design: { status: "pending", approved_at: null },
    implementation_plan: { status: "pending", approved_at: null },
    completion: { status: "pending", approved_at: null },
  };
}

function baseState() {
  return {
    schema_version: 4,
    workflow: { profile: "full", goal: null, status: "ready", started_at: null },
    stage: "FEATURE_DEFINITION",
    stages: {},
    import: null,
    implementation_analysis: null,
    current_task: null,
    gates: defaultGates(),
    tasks: {},
    history: [],
  };
}

function normalizeState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("state.json must contain a JSON object.");

  const state = { ...baseState(), ...value };
  state.schema_version = 4;
  state.workflow = { ...baseState().workflow, ...(value.workflow ?? {}) };
  state.gates = { ...defaultGates(), ...(value.gates ?? {}) };
  for (const [gate, initial] of Object.entries(defaultGates())) {
    state.gates[gate] = { ...initial, ...(state.gates[gate] ?? {}) };
  }
  state.tasks = value.tasks && typeof value.tasks === "object" ? value.tasks : {};
  const hadStageRecords = value.stages && typeof value.stages === "object" && Object.keys(value.stages).length > 0;
  state.stages = hadStageRecords ? value.stages : {};
  state.history = Array.isArray(value.history) ? value.history : [];
  if (!state.stage || typeof state.stage !== "string") state.stage = "FEATURE_DEFINITION";
  if (state.workflow.profile === "full" && state.stage === "WIREFRAME") state.stage = "OPEN_DESIGN";
  if (state.workflow.profile === "prototype" && state.stage === "MINIMAL_DESIGN") state.stage = "OPEN_DESIGN";
  if (state.workflow.profile === "prototype" && state.stage === "PROTOTYPE_REVIEW" && state.workflow.status === "waiting_human") {
    state.workflow.status = "running";
  }
  const definition = profiles[state.workflow.profile] ?? profiles.full;
  const currentIndex = definition.stages.findIndex((stage) => stage.id === state.stage);
  const completedFromHistory = new Set(state.history
    .filter((entry) => entry?.event === "stage_completed" && entry.completed_stage)
    .map((entry) => entry.completed_stage));
  for (const stage of definition.stages) {
    const inferredCompleted = !hadStageRecords && (
      completedFromHistory.has(stage.id)
      || (definition.stages.findIndex((item) => item.id === stage.id) < currentIndex && !stage.gate)
      || (stage.gate && ["approved", "satisfied"].includes(state.gates[stage.gate]?.status))
      || (stage.id === state.stage && stage.terminal && state.workflow.status === "complete")
    );
    state.stages[stage.id] = {
      status: inferredCompleted
        ? "COMPLETED"
        : stage.id === state.stage && state.workflow.status === "running" ? "RUNNING" : "PENDING",
      source: [],
      validation: { status: "PENDING", missing: [], warnings: [] },
      approval: null,
      started_at: null,
      completed_at: inferredCompleted ? state.workflow.started_at : null,
      ...(state.stages[stage.id] ?? {}),
    };
  }
  return state;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendHistory(state, event, details = {}) {
  state.history.push({ at: timestamp(), event, stage: state.stage, ...details });
}

function resolveImportBlocker(state, resolvedStage, nextStage) {
  if (state.import?.blocker?.stage !== resolvedStage) return;
  state.import = {
    ...state.import,
    actual_stage: nextStage,
    status: state.import.warnings?.length ? "IMPORT_WITH_WARNINGS" : "IMPORTED",
    blocker: null,
    resolved_at: timestamp(),
  };
}

function initialStageRecord() {
  return {
    status: "PENDING",
    source: [],
    validation: { status: "PENDING", missing: [], warnings: [] },
    approval: null,
    started_at: null,
    completed_at: null,
  };
}

function stageRecords(profile) {
  return Object.fromEntries(getProfile(profile).stages.map((stage) => [stage.id, initialStageRecord()]));
}

function createOrValidate(path, initialValue) {
  if (existsSync(path)) {
    try {
      JSON.parse(readFileSync(path, "utf8"));
      return "preserved";
    } catch (error) {
      throw new Error(`${path} exists but is not valid JSON: ${error.message}`);
    }
  }
  writeJson(path, initialValue);
  return "created";
}

export function initializeWorkflow(directory) {
  const root = join(directory, ".workflow");
  for (const artifactDirectory of directories) mkdirSync(join(root, artifactDirectory), { recursive: true });
  const stateResult = createOrValidate(statePath(directory), baseState());
  const traceabilityResult = createOrValidate(traceabilityPath(directory), { schema_version: 1, requirements: [] });
  return { root, state: stateResult, traceability: traceabilityResult };
}

export function readWorkflow(directory) {
  if (!existsSync(statePath(directory))) throw new Error("Workflow is not initialized. Run /workflow-init or workflow_init first.");
  try {
    return normalizeState(JSON.parse(readFileSync(statePath(directory), "utf8")));
  } catch (error) {
    throw new Error(`Workflow state is invalid: ${error.message}`);
  }
}

export function saveWorkflow(directory, state) {
  writeJson(statePath(directory), normalizeState(state));
  return readWorkflow(directory);
}

export function currentDefinition(state) {
  return getProfile(state.workflow.profile);
}

export function currentStageDefinition(state) {
  return currentDefinition(state).stages.find((stage) => stage.id === state.stage);
}

export function nextStage(state) {
  const stages = currentDefinition(state).stages;
  const index = stages.findIndex((stage) => stage.id === state.stage);
  if (index === -1) throw new Error(`Stage ${state.stage} does not belong to profile ${state.workflow.profile}.`);
  return stages[index + 1] ?? null;
}

function artifactsFor(stage, profile) {
  if (stage === "BUILD" && profile === "prototype") return ["prototypes/build.md"];
  if (stage === "OPEN_DESIGN" && profile === "prototype") {
    return [
      "requirements/feature-spec.md",
      "design/DESIGN.md",
      "design/user-flow.md",
      "design/wireframes/",
      "design/screens/",
    ];
  }
  return requiredArtifacts[stage] ?? [];
}

function artifactExists(directory, relativePath) {
  const absolute = join(directory, ".workflow", relativePath);
  if (!existsSync(absolute)) return false;
  const stats = statSync(absolute);
  if (!relativePath.endsWith("/")) return stats.isFile() && stats.size > 0;
  return stats.isDirectory() && readdirSync(absolute).length > 0;
}

export function missingArtifacts(directory, stage, profile = "full") {
  return artifactsFor(stage, profile).filter((relativePath) => !artifactExists(directory, relativePath));
}

const conventionalSources = {
  FEATURE_DEFINITION: ["PRD.md", "docs/PRD.md", "docs/prd.md", "requirements.md", "docs/requirements.md"],
  REQUIREMENT: ["PRD.md", "docs/PRD.md", "docs/prd.md", "requirements.md", "docs/requirements.md"],
  GOAL: ["PRD.md", "docs/PRD.md", "docs/prd.md", "requirements.md", "docs/requirements.md"],
  USER_FLOW: ["USER_FLOW.md", "docs/user-flow.md", "docs/user_flow.md", "docs/flows.md"],
  OPEN_DESIGN: ["DESIGN.md", "docs/DESIGN.md", "docs/design.md", "docs/ui-design.md", "docs/wireframes"],
  OPEN_DESIGN_LITE: ["DESIGN.md", "docs/DESIGN.md", "docs/design.md", "docs/ui-design.md", "docs/wireframes"],
  ARCHITECTURE: ["ARCHITECTURE.md", "docs/ARCHITECTURE.md", "docs/architecture.md", "docs/adr", "docs/decisions"],
  TASK_DECOMPOSITION: ["PLAN.md", "TASKS.md", "tasks.json", "docs/plan.md", "docs/tasks.md"],
  LIGHT_PLAN: ["PLAN.md", "TASKS.md", "tasks.json", "docs/plan.md", "docs/tasks.md"],
  TASK_DEFINITION: ["PLAN.md", "TASKS.md", "tasks.json", "docs/plan.md", "docs/tasks.md"],
  TDD_PLAN: ["TDD_PLAN.md", "docs/tdd-plan.md", "docs/test-plan.md"],
};

function usableSource(directory, source) {
  if (/^https?:\/\//i.test(source)) return { valid: true, warning: `External source was registered but not fetched: ${source}` };
  const absolute = resolve(directory, source);
  if (!existsSync(absolute)) return { valid: false, warning: `Registered source does not exist: ${source}` };
  const stats = statSync(absolute);
  if (stats.isDirectory()) return readdirSync(absolute).length
    ? { valid: true, warning: null }
    : { valid: false, warning: `Registered source directory is empty: ${source}` };
  return stats.size > 0
    ? { valid: true, warning: null }
    : { valid: false, warning: `Registered source file is empty: ${source}` };
}

function detectConventionalSources(directory, stage) {
  const found = [];
  for (const candidate of conventionalSources[stage] ?? []) {
    if (usableSource(directory, candidate).valid) found.push(candidate);
  }
  return found;
}

function sourceReferencesFor(stage, sources = []) {
  return sources
    .filter((entry) => entry?.stage === stage && typeof entry.source === "string" && entry.source.trim())
    .map((entry) => entry.source.trim());
}

function markdownWarnings(directory, stage) {
  const warnings = [];
  const paths = artifactsFor(stage, "full").filter((path) => path.endsWith(".md") && artifactExists(directory, path));
  for (const path of paths) {
    const content = readFileSync(join(directory, ".workflow", path), "utf8").trim();
    if (content.length < 40) warnings.push(`Imported artifact may be too brief for reliable validation: .workflow/${path}`);
  }
  if (["OPEN_DESIGN", "OPEN_DESIGN_LITE"].includes(stage)) {
    const designPath = join(directory, ".workflow", "design", "DESIGN.md");
    if (existsSync(designPath)) {
      const design = readFileSync(designPath, "utf8").toLowerCase();
      const missingStates = ["loading", "empty", "error"].filter((state) => !design.includes(state));
      if (missingStates.length) warnings.push(`Design does not explicitly mention ${missingStates.join(", ")} states.`);
      if (!/(interaction|interaction|인터랙션|상호작용)/i.test(design)) warnings.push("Design does not explicitly describe interaction behavior.");
    }
  }
  const tracePath = traceabilityPath(directory);
  if (["OPEN_DESIGN", "TRACEABILITY_CHECK", "TDD_PLAN"].includes(stage) && existsSync(tracePath)) {
    try {
      const traceability = JSON.parse(readFileSync(tracePath, "utf8"));
      if (!Array.isArray(traceability.requirements) || traceability.requirements.length === 0) {
        warnings.push("Traceability exists but contains no requirement mappings.");
      }
    } catch {
      warnings.push("Traceability JSON could not be parsed.");
    }
  }
  return warnings;
}

export function validateExistingStage(directory, stage, profile = "full", sources = []) {
  const required = artifactsFor(stage, profile);
  const present = required.filter((path) => artifactExists(directory, path));
  const missing = required.filter((path) => !artifactExists(directory, path));
  const registered = sourceReferencesFor(stage, sources);
  const conventional = detectConventionalSources(directory, stage);
  const source = [...present.map((path) => `.workflow/${path}`), ...new Set([...registered, ...conventional])];
  const sourceChecks = source
    .filter((item) => !item.startsWith(".workflow/"))
    .map((item) => ({ source: item, ...usableSource(directory, item) }));
  const usableAlternatives = sourceChecks.filter((item) => item.valid);
  const warnings = [
    ...markdownWarnings(directory, stage),
    ...sourceChecks.map((item) => item.warning).filter(Boolean),
  ];

  if (["TRACEABILITY_CHECK", "TDD_PLAN", "IMPLEMENTATION_REVIEW"].includes(stage)) {
    const tracePath = traceabilityPath(directory);
    let traceabilityValid = false;
    if (existsSync(tracePath)) {
      try {
        const value = JSON.parse(readFileSync(tracePath, "utf8"));
        traceabilityValid = Array.isArray(value.requirements) && value.requirements.length > 0;
      } catch {
        traceabilityValid = false;
      }
    }
    if (!traceabilityValid) {
      return {
        status: "BLOCKED",
        source,
        present,
        missing: [".workflow/traceability.json with at least one requirement mapping"],
        warnings,
      };
    }
  }

  if (missing.length && usableAlternatives.length === 0) {
    return { status: "BLOCKED", source, present, missing, warnings };
  }
  if (missing.length) {
    warnings.push(`External or conventional source substitutes for missing managed artifacts: ${missing.map((path) => `.workflow/${path}`).join(", ")}`);
  }
  return {
    status: warnings.length ? "IMPORT_WITH_WARNINGS" : "VALID",
    source,
    present,
    missing: [],
    substituted: missing,
    warnings,
  };
}

const scanExclusions = new Set([".git", ".workflow", "node_modules", "vendor", "build", "dist", ".dart_tool", ".next", "Pods"]);
const sourceExtensions = new Set([".c", ".cc", ".cpp", ".cs", ".dart", ".go", ".java", ".js", ".jsx", ".kt", ".kts", ".m", ".mm", ".php", ".py", ".rb", ".rs", ".swift", ".ts", ".tsx", ".vue"]);

function implementationFiles(directory) {
  const files = [];
  const visit = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink() || scanExclusions.has(entry.name)) continue;
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && sourceExtensions.has(extname(entry.name).toLowerCase())) files.push(absolute);
    }
  };
  visit(directory);
  return files;
}

function requirementIds(directory, sources = []) {
  const candidates = [join(directory, ".workflow", "requirements", "feature-spec.md")];
  for (const stage of ["FEATURE_DEFINITION", "REQUIREMENT", "GOAL"]) {
    for (const source of [...detectConventionalSources(directory, stage), ...sourceReferencesFor(stage, sources)]) {
      if (!/^https?:\/\//i.test(source)) candidates.push(resolve(directory, source));
    }
  }
  const ids = new Set();
  for (const path of candidates) {
    if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size > 2_000_000) continue;
    for (const match of readFileSync(path, "utf8").matchAll(/\bREQ-[A-Z0-9]+-\d+\b/g)) ids.add(match[0]);
  }
  return [...ids].sort();
}

export function analyzeExistingImplementation(directory, sources = []) {
  const files = implementationFiles(directory);
  const requirements = requirementIds(directory, sources);
  const coverage = requirements.map((id) => {
    const matches = [];
    const tests = [];
    for (const file of files) {
      if (statSync(file).size > 2_000_000) continue;
      let content = "";
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      if (!content.includes(id)) continue;
      const rel = relative(directory, file);
      if (/(^|\/)(test|tests|spec|specs)(\/|$)|[._-](test|spec)\./i.test(rel)) tests.push(rel);
      else matches.push(rel);
    }
    return {
      requirement: id,
      status: matches.length && tests.length ? "DONE" : matches.length || tests.length ? "PARTIAL" : "NOT_IMPLEMENTED",
      implementation_evidence: matches,
      test_evidence: tests,
    };
  });
  const warnings = [];
  if (requirements.length) warnings.push("Coverage is based on explicit requirement-ID references in source and tests; it is traceability evidence, not semantic proof of behavior.");
  if (!requirements.length) warnings.push("No stable requirement IDs were found; semantic implementation coverage is NOT_ASSESSED.");
  if (!files.length) warnings.push("No source files were detected outside ignored build and dependency directories.");
  return {
    analyzed_at: timestamp(),
    status: requirements.length ? "ASSESSED" : "NOT_ASSESSED",
    source_file_count: files.length,
    requirement_count: requirements.length,
    coverage,
    warnings,
  };
}

const startAliases = {
  full: { start: "FEATURE_DEFINITION", design: "USER_FLOW", architecture: "ARCHITECTURE", planning: "TASK_DECOMPOSITION", build: "BUILD", review: "TASK_REVIEW" },
  quick: { start: "REQUIREMENT", design: "OPEN_DESIGN_LITE", planning: "LIGHT_PLAN", build: "BUILD", review: "TASK_REVIEW" },
  bugfix: { start: "BUG_REPORT", design: "REPRODUCE", architecture: "ROOT_CAUSE", planning: "REGRESSION_TEST", build: "FIX", review: "REGRESSION_REVIEW" },
  prototype: { start: "GOAL", design: "USER_FLOW", architecture: "CONSTRAINTS", planning: "CONSTRAINTS", build: "BUILD", review: "PROTOTYPE_REVIEW" },
};

function aliasForStage(profile, stage) {
  const entries = Object.entries(startAliases[profile]);
  const definition = getProfile(profile);
  const index = definition.stages.findIndex((item) => item.id === stage);
  let selected = "start";
  for (const [alias, candidate] of entries) {
    if (definition.stages.findIndex((item) => item.id === candidate) <= index) selected = alias;
  }
  return selected;
}

export function inspectExistingWorkflow(directory, { profile = "full", sources = [] } = {}) {
  const definition = getProfile(profile);
  const stageIds = new Set(definition.stages.map((stage) => stage.id));
  const invalidSource = sources.find((entry) => !stageIds.has(entry?.stage));
  if (invalidSource) throw new Error(`Source stage ${invalidSource.stage ?? "<missing>"} does not belong to profile ${profile}.`);
  const implementation = analyzeExistingImplementation(directory, sources);
  const stages = {};
  for (const stage of definition.stages) {
    if (stage.gate || stage.terminal) continue;
    if (stage.id === "BUILD") {
      stages[stage.id] = implementation.source_file_count
        ? { status: "IMPORT_WITH_WARNINGS", source: ["existing implementation"], present: [], missing: [], warnings: ["Implementation presence was detected; requirement coverage still controls whether work is complete."] }
        : { status: "BLOCKED", source: [], present: [], missing: ["existing implementation"], warnings: [] };
    } else {
      stages[stage.id] = validateExistingStage(directory, stage.id, profile, sources);
    }
  }
  const firstBlocked = definition.stages.find((stage) => !stage.gate && !stage.terminal && stages[stage.id]?.status === "BLOCKED");
  const recommendedStage = firstBlocked?.id ?? (implementation.source_file_count ? startAliases[profile].review : startAliases[profile].build);
  const recommendedIndex = definition.stages.findIndex((stage) => stage.id === recommendedStage);
  const requiredGates = definition.stages
    .slice(0, Math.max(0, recommendedIndex))
    .filter((stage) => stage.gate)
    .map((stage) => stage.gate);
  const detected = Object.values(stages).some((result) => result.source?.length > 0);
  return {
    profile,
    detected,
    stages,
    implementation,
    recommended_from: aliasForStage(profile, recommendedStage),
    recommended_stage: recommendedStage,
    required_gates: requiredGates,
  };
}

export function startWorkflow(directory, {
  profile,
  goal,
  reset = false,
  from = "start",
  sources = [],
  verifiedGates = [],
}) {
  if (!profiles[profile]) getProfile(profile);
  if (!goal?.trim()) throw new Error("A non-empty workflow goal is required.");
  if (!startAliases[profile]?.[from] && from !== "auto") throw new Error(`Unsupported start point '${from}' for profile ${profile}.`);
  const definition = getProfile(profile);
  const profileGates = new Set(definition.stages.map((stage) => stage.gate).filter(Boolean));
  const invalidVerifiedGate = verifiedGates.find((gate) => !profileGates.has(gate));
  if (invalidVerifiedGate) throw new Error(`Gate ${invalidVerifiedGate} does not belong to profile ${profile}.`);
  initializeWorkflow(directory);

  const existing = readWorkflow(directory);
  if (existing.workflow.status === "running" || existing.workflow.status === "waiting_human") {
    if (!reset) throw new Error(`A ${existing.workflow.profile} workflow is already ${existing.workflow.status} at ${existing.stage}. Finish it or pass reset: true.`);
  }

  const inspection = inspectExistingWorkflow(directory, { profile, sources });
  const selectedFrom = from === "auto" ? inspection.recommended_from : from;
  const requestedStage = startAliases[profile][selectedFrom];
  const requestedIndex = definition.stages.findIndex((stage) => stage.id === requestedStage);
  const state = baseState();
  state.workflow = { profile, goal: goal.trim(), status: "running", started_at: timestamp() };
  state.stage = requestedStage;
  state.stages = stageRecords(profile);

  const importWarnings = [];
  let blocker = null;
  for (const stage of definition.stages.slice(0, requestedIndex)) {
    if (stage.terminal) continue;
    if (stage.gate) {
      if (verifiedGates.includes(stage.gate)) {
        state.gates[stage.gate] = { status: "satisfied", approved_at: timestamp(), approval: "VERIFIED_BY_USER" };
        state.stages[stage.id] = {
          ...state.stages[stage.id],
          status: "COMPLETED",
          approval: "VERIFIED_BY_USER",
          validation: { status: "VALID", missing: [], warnings: [] },
          completed_at: timestamp(),
        };
      } else {
        blocker = { type: "GATE_REQUIRED", stage: stage.id, gate: stage.gate };
        state.stage = stage.id;
        state.workflow.status = "waiting_human";
        break;
      }
      continue;
    }

    const validation = inspection.stages[stage.id];
    if (validation?.status === "BLOCKED") {
      blocker = { type: "INVALID_ARTIFACTS", stage: stage.id, missing: validation.missing };
      state.stage = stage.id;
      state.stages[stage.id] = {
        ...state.stages[stage.id],
        status: "INVALID",
        source: validation.source,
        validation,
        started_at: timestamp(),
      };
      break;
    }
    state.stages[stage.id] = {
      ...state.stages[stage.id],
      status: "IMPORTED",
      source: validation?.source ?? [],
      validation,
      completed_at: timestamp(),
    };
    importWarnings.push(...(validation?.warnings ?? []).map((warning) => `${stage.id}: ${warning}`));
  }

  if (!blocker) {
    state.stages[state.stage] = {
      ...state.stages[state.stage],
      status: "RUNNING",
      started_at: timestamp(),
    };
  }

  const targetNeedsCoverage = ["planning", "build", "review"].includes(selectedFrom);
  if (targetNeedsCoverage) {
    state.implementation_analysis = inspection.implementation;
    writeJson(join(directory, ".workflow", "reviews", "implementation-coverage.json"), inspection.implementation);
  }
  const importStatus = blocker
    ? "BLOCKED"
    : importWarnings.length ? "IMPORT_WITH_WARNINGS" : selectedFrom === "start" ? "NOT_REQUESTED" : "IMPORTED";
  state.import = {
    requested_from: from,
    selected_from: selectedFrom,
    requested_stage: requestedStage,
    actual_stage: state.stage,
    status: importStatus,
    warnings: importWarnings,
    sources,
    blocker,
    inspected_at: timestamp(),
  };
  appendHistory(state, "workflow_started", {
    profile,
    goal: state.workflow.goal,
    reset,
    requested_from: from,
    selected_from: selectedFrom,
    actual_stage: state.stage,
    import_status: importStatus,
  });
  saveWorkflow(directory, state);
  return state;
}

function assertArtifacts(directory, stage, profile) {
  const missing = missingArtifacts(directory, stage, profile);
  if (missing.length) throw new Error(`Cannot complete ${stage}; missing required artifacts: ${missing.map((path) => `.workflow/${path}`).join(", ")}.`);
}

function readTasks(directory) {
  const path = join(directory, ".workflow", "tasks", "tasks.json");
  if (!existsSync(path)) return [];
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(value) ? value : Array.isArray(value.tasks) ? value.tasks : Object.values(value.tasks ?? {});
  } catch {
    return [];
  }
}

function allTasksDone(directory) {
  const tasks = readTasks(directory);
  return tasks.length > 0 && tasks.every((task) => task?.status === "done" && task?.review === "PASS");
}

function hasHumanRequiredTask(directory) {
  return readTasks(directory).some((task) => task?.status === "human_required" || task?.review === "HUMAN_REQUIRED");
}

export function completeStage(directory, { stage, summary = "" }) {
  const state = readWorkflow(directory);
  if (state.workflow.status === "ready") throw new Error("Start the workflow first with workflow_start.");
  if (state.workflow.status === "waiting_human") throw new Error(`Workflow is waiting for human approval at ${state.stage}.`);
  if (stage !== state.stage) throw new Error(`Cannot complete ${stage}; current stage is ${state.stage}.`);
  if (currentStageDefinition(state)?.gate) throw new Error(`${stage} is a human gate. Use workflow_approve or workflow_reject.`);
  if (state.stage === "TASK_REVIEW") {
    if (hasHumanRequiredTask(directory)) {
      state.workflow.status = "waiting_human";
      state.stages[state.stage] = { ...state.stages[state.stage], status: "PENDING" };
      appendHistory(state, "human_review_required", { summary });
      saveWorkflow(directory, state);
      return state;
    }
    if (allTasksDone(directory)) {
      // Continue through artifact validation and transition to FINAL_REVIEW below.
    } else {
      state.stages[state.stage] = {
        ...state.stages[state.stage],
        status: "COMPLETED",
        validation: { status: "VALID", missing: [], warnings: [] },
        completed_at: timestamp(),
      };
      state.stage = "BUILD";
      state.stages.BUILD = { ...state.stages.BUILD, status: "RUNNING", started_at: timestamp() };
      appendHistory(state, "review_cycle_continues", { summary });
      saveWorkflow(directory, state);
      return state;
    }
  }
  assertArtifacts(directory, stage, state.workflow.profile);

  const next = nextStage(state);
  if (!next) throw new Error(`No next stage is defined after ${stage}.`);
  state.stages[stage] = {
    ...state.stages[stage],
    status: "COMPLETED",
    validation: { status: "VALID", missing: [], warnings: [] },
    completed_at: timestamp(),
  };
  state.stage = next.id;
  state.workflow.status = next.gate ? "waiting_human" : next.terminal ? "complete" : "running";
  state.stages[next.id] = {
    ...state.stages[next.id],
    status: next.terminal ? "COMPLETED" : next.gate ? "PENDING" : "RUNNING",
    started_at: next.gate || next.terminal ? state.stages[next.id].started_at : timestamp(),
    completed_at: next.terminal ? timestamp() : state.stages[next.id].completed_at,
  };
  if (next.terminal) {
    state.gates.completion = { status: "approved", approved_at: timestamp() };
  }
  resolveImportBlocker(state, stage, next.id);
  appendHistory(state, "stage_completed", { completed_stage: stage, next_stage: next.id, summary });
  saveWorkflow(directory, state);
  return state;
}

export function approveGate(directory, { gate }) {
  const state = readWorkflow(directory);
  const current = currentStageDefinition(state);
  if (!current?.gate || current.gate !== gate) throw new Error(`Cannot approve ${gate}; current stage is ${state.stage}.`);
  const importedEvidenceStage = {
    product_design: "OPEN_DESIGN",
    implementation_plan: "TDD_PLAN",
  }[gate];
  const importedEvidence = importedEvidenceStage ? state.stages[importedEvidenceStage] : null;
  if (importedEvidence?.status === "IMPORTED") {
    const validation = validateExistingStage(
      directory,
      importedEvidenceStage,
      state.workflow.profile,
      state.import?.sources ?? [],
    );
    if (validation.status === "BLOCKED") {
      throw new Error(`Cannot approve ${gate}; imported evidence is invalid: ${validation.missing.join(", ")}.`);
    }
    state.stages[importedEvidenceStage] = { ...importedEvidence, validation, source: validation.source };
  } else {
    assertArtifacts(directory, state.stage, state.workflow.profile);
  }
  state.gates[gate] = { status: "approved", approved_at: timestamp(), approval: "APPROVED_BY_USER" };
  state.stages[state.stage] = {
    ...state.stages[state.stage],
    status: "COMPLETED",
    approval: "APPROVED_BY_USER",
    validation: { status: "VALID", missing: [], warnings: [] },
    completed_at: timestamp(),
  };
  const next = nextStage(state);
  if (!next) throw new Error(`No stage follows ${state.stage}.`);
  state.stage = next.id;
  state.workflow.status = "running";
  state.stages[next.id] = { ...state.stages[next.id], status: "RUNNING", started_at: timestamp() };
  resolveImportBlocker(state, current.id, next.id);
  appendHistory(state, "gate_approved", { gate, next_stage: next.id });
  saveWorkflow(directory, state);
  return state;
}

export function rejectGate(directory, { gate, reason }) {
  const state = readWorkflow(directory);
  const current = currentStageDefinition(state);
  if (!current?.gate || current.gate !== gate) throw new Error(`Cannot reject ${gate}; current stage is ${state.stage}.`);
  if (!reason?.trim()) throw new Error("A rejection reason is required.");
  state.gates[gate] = { status: "pending", approved_at: null };
  state.stages[state.stage] = { ...state.stages[state.stage], status: "PENDING", approval: null };
  state.stage = gateFallbackStage[gate];
  state.workflow.status = "running";
  state.stages[state.stage] = { ...state.stages[state.stage], status: "RUNNING", started_at: timestamp() };
  appendHistory(state, "gate_rejected", { gate, reason: reason.trim(), next_stage: state.stage });
  saveWorkflow(directory, state);
  return state;
}

export function continueWorkflow(directory, { summary = "" } = {}) {
  const state = readWorkflow(directory);
  const current = currentStageDefinition(state);
  if (state.workflow.status === "waiting_human") {
    if (current?.gate) throw new Error(`Workflow is waiting for the ${current.gate} gate. Use workflow_approve or workflow_reject.`);
    state.workflow.status = "running";
    appendHistory(state, "human_review_resumed", { summary });
    saveWorkflow(directory, state);
    return state;
  }
  return completeStage(directory, { stage: state.stage, summary });
}

export function requestHumanReview(directory, { reason }) {
  if (!reason?.trim()) throw new Error("A concrete reason is required before requesting human review.");
  const state = readWorkflow(directory);
  if (state.workflow.status !== "running") throw new Error(`Cannot request human review while workflow status is ${state.workflow.status}.`);
  state.workflow.status = "waiting_human";
  appendHistory(state, "human_review_requested", { reason: reason.trim() });
  saveWorkflow(directory, state);
  return state;
}

export function skipStage(directory, { stage, reason, confirmedByUser = false }) {
  if (!confirmedByUser) throw new Error("Skipping requires explicit user confirmation through /workflow-skip.");
  if (!reason?.trim()) throw new Error("A concrete reason is required to skip a stage.");
  const state = readWorkflow(directory);
  if (state.workflow.status !== "running") throw new Error(`Cannot skip while workflow status is ${state.workflow.status}.`);
  if (state.stage !== stage) throw new Error(`Cannot skip ${stage}; current stage is ${state.stage}.`);
  const current = currentStageDefinition(state);
  if (current?.gate || current?.terminal) throw new Error(`${stage} is a gate or terminal stage and cannot be skipped.`);
  const next = nextStage(state);
  if (!next || next.terminal) throw new Error(`${stage} cannot be skipped because it would complete the workflow without final evidence.`);

  state.stages[stage] = {
    ...state.stages[stage],
    status: "SKIPPED",
    source: [],
    validation: { status: "NOT_APPLICABLE", missing: [], warnings: [reason.trim()] },
    completed_at: timestamp(),
  };
  state.stage = next.id;
  state.workflow.status = next.gate ? "waiting_human" : "running";
  state.stages[next.id] = {
    ...state.stages[next.id],
    status: next.gate ? "PENDING" : "RUNNING",
    started_at: next.gate ? state.stages[next.id].started_at : timestamp(),
  };
  resolveImportBlocker(state, stage, next.id);
  appendHistory(state, "stage_skipped", { skipped_stage: stage, reason: reason.trim(), next_stage: next.id });
  saveWorkflow(directory, state);
  return state;
}

export function recordDispatch(directory, { session_id, agent, stage, ponytail_mode = "off" }) {
  const state = readWorkflow(directory);
  state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
  state.sessions.push({ id: session_id, agent, stage, ponytail_mode, started_at: timestamp(), status: "running" });
  appendHistory(state, "stage_dispatched", { session_id, agent, dispatched_stage: stage, ponytail_mode });
  saveWorkflow(directory, state);
  return state;
}

export function workflowStatus(directory) {
  const state = readWorkflow(directory);
  const missing = missingArtifacts(directory, state.stage, state.workflow.profile);
  const current = currentStageDefinition(state);
  const gate = current?.gate ?? null;
  const humanReviewReason = state.workflow.status === "waiting_human" && !gate
    ? [...(state.history ?? [])].reverse().find((entry) => entry.event === "human_review_requested")?.reason ?? null
    : null;
  return {
    profile: state.workflow.profile,
    goal: state.workflow.goal,
    status: state.workflow.status,
    stage: state.stage,
    current_task: state.current_task,
    gates: state.gates,
    stages: state.stages,
    import: state.import,
    implementation_analysis: state.implementation_analysis,
    ponytail: {
      mode: current?.ponytail ?? "off",
      review_required: Boolean(current?.ponytail_review),
      audit: current?.ponytail_audit ?? null,
    },
    waiting_for_gate: state.workflow.status === "waiting_human" ? gate ?? "HUMAN_REVIEW" : null,
    human_review_reason: humanReviewReason,
    missing_artifacts: missing.map((path) => `.workflow/${path}`),
    next_stage: state.workflow.status === "waiting_human" ? null : nextStage(state)?.id ?? null,
  };
}
