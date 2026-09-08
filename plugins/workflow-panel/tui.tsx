import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createSignal } from "solid-js";
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";

type WorkflowState = {
  workflow?: { status?: string };
  stage?: string;
  gates?: Record<string, { status?: string }>;
  history?: Array<{
    event?: string;
    session_id?: string;
    agent?: string;
    dispatched_stage?: string;
  }>;
};

type PanelState = {
  kind: "missing" | "ready" | "error";
  workflow?: WorkflowState;
  worker?: { sessionID: string; agent?: string; stage?: string; status: string };
};

function label(value?: string) {
  return value ? value.replaceAll("_", " ") : "-";
}

function statusColor(status?: string) {
  if (["running", "busy"].includes(status ?? "")) return "yellow";
  if (["waiting_human", "idle"].includes(status ?? "")) return "green";
  if (["retry", "error"].includes(status ?? "")) return "red";
  return "gray";
}

function readPanelState(directory: string, sessionStatus: (id: string) => { type?: string } | undefined): PanelState {
  try {
    const file = join(directory, ".workflow", "state.json");
    if (!existsSync(file)) return { kind: "missing" };

    const workflow = JSON.parse(readFileSync(file, "utf8")) as WorkflowState;
    const dispatch = [...(workflow.history ?? [])]
      .reverse()
      .find((entry) => entry.event === "stage_dispatched" && entry.session_id);

    return {
      kind: "ready",
      workflow,
      worker: dispatch?.session_id
        ? {
            sessionID: dispatch.session_id,
            agent: dispatch.agent,
            stage: dispatch.dispatched_stage,
            status: sessionStatus(dispatch.session_id)?.type ?? "unknown",
          }
        : undefined,
    };
  } catch {
    return { kind: "error" };
  }
}

function WorkflowStatus(props: { state: () => PanelState }) {
  const panel = () => props.state();
  const gate = () => {
    const workflow = panel().workflow;
    if (workflow?.workflow?.status !== "waiting_human") return undefined;

    const stageGate = {
      PRODUCT_REVIEW: "product_design",
      IMPLEMENTATION_REVIEW: "implementation_plan",
    }[workflow.stage ?? ""];
    if (stageGate && workflow.gates?.[stageGate]?.status === "pending") return stageGate;

    return "HUMAN_REVIEW";
  };

  if (panel().kind === "missing") return null;
  if (panel().kind === "error") return <text fg="red">Workflow state unavailable</text>;

  return (
    <box flexDirection="column" marginTop={1} paddingLeft={1} paddingRight={1}>
      <text fg="cyan">Workflow</text>
      <text fg={statusColor(panel().workflow?.workflow?.status)}>Stage · {label(panel().workflow?.stage)}</text>
      <text fg={statusColor(panel().workflow?.workflow?.status)}>Status · {label(panel().workflow?.workflow?.status)}</text>
      {gate() && <text fg="yellow">Gate · {label(gate())}</text>}
      {panel().worker && (
        <text fg={statusColor(panel().worker?.status)}>
          Worker · {panel().worker?.agent ?? "unknown"} · {label(panel().worker?.stage)} · {label(panel().worker?.status)}
        </text>
      )}
    </box>
  );
}

const WorkflowPanel: TuiPlugin = async (api) => {
  const read = () => readPanelState(api.state.path.directory, (id) => api.state.session.status(id));
  const [panelState, setPanelState] = createSignal(read());
  const refresh = () => setPanelState(read());
  const unsubscribers = [
    api.event.on("session.created", refresh),
    api.event.on("session.updated", refresh),
    api.event.on("session.status", (event) => {
      const current = panelState().worker;
      if (current?.sessionID !== event.properties.sessionID) return;
      setPanelState({ ...panelState(), worker: { ...current, status: event.properties.status.type } });
    }),
    api.event.on("session.idle", (event) => {
      const current = panelState().worker;
      if (current?.sessionID !== event.properties.sessionID) return;
      setPanelState({ ...panelState(), worker: { ...current, status: "idle" } });
    }),
    api.event.on("session.error", (event) => {
      const current = panelState().worker;
      if (current?.sessionID !== event.properties.sessionID) return;
      setPanelState({ ...panelState(), worker: { ...current, status: "error" } });
    }),
  ];
  api.lifecycle.onDispose(() => unsubscribers.forEach((unsubscribe) => unsubscribe()));

  api.slots.register({
    order: 899,
    slots: {
      sidebar_content: () => <WorkflowStatus state={panelState} />,
    },
  });
};

export default { id: "workflow-panel", tui: WorkflowPanel } satisfies TuiPluginModule;
