import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Show, createSignal } from "solid-js";
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";

type WorkflowState = {
  workflow?: { profile?: string; status?: string; goal?: string };
  stage?: string;
  gates?: Record<string, { status?: string }>;
  history?: Array<{
    event?: string;
    session_id?: string;
    agent?: string;
    dispatched_stage?: string;
    started_at?: string;
  }>;
};

type PanelState = {
  kind: "missing" | "ready" | "error";
  workflow?: WorkflowState;
  worker?: { sessionID: string; agent?: string; stage?: string; status: string };
};

function latestWorker(workflow: WorkflowState) {
  return [...(workflow.history ?? [])]
    .reverse()
    .find((entry) => entry.event === "stage_dispatched" && entry.session_id);
}

function label(value?: string) {
  return value ? value.replaceAll("_", " ") : "-";
}

function statusColor(status?: string) {
  if (["running", "busy"].includes(status ?? "")) return "yellow";
  if (["waiting_human", "idle"].includes(status ?? "")) return "green";
  if (["retry", "error"].includes(status ?? "")) return "red";
  return "gray";
}

function WorkflowStatus(props: { state: () => PanelState }) {
  const panel = () => props.state();
  const workflow = () => panel().workflow;
  const worker = () => panel().worker;
  const gate = () => Object.entries(workflow()?.gates ?? {}).find(([, value]) => value.status === "pending")?.[0];

  return (
    <box flexDirection="column" marginTop={1} paddingLeft={1} paddingRight={1}>
      <text fg="cyan">Workflow</text>
      <Show when={panel().kind === "missing"}>
        <text fg="gray">No managed workflow</text>
      </Show>
      <Show when={panel().kind === "error"}>
        <text fg="red">Could not read workflow state</text>
      </Show>
      <Show when={panel().kind === "ready"}>
        <box flexDirection="column">
          <text fg={statusColor(workflow()?.workflow?.status)}>Stage · {label(workflow()?.stage)}</text>
          <text fg={statusColor(workflow()?.workflow?.status)}>Status · {label(workflow()?.workflow?.status)}</text>
          <Show when={gate()}>
            <text fg="yellow">Gate · {label(gate())}</text>
          </Show>
          <Show when={worker()}>
            <box flexDirection="column" marginTop={1}>
              <text fg="gray">Worker</text>
              <text>{worker()?.agent ?? "unknown"} · {label(worker()?.stage)}</text>
              <text fg={statusColor(worker()?.status)}>● {label(worker()?.status)} · {worker()?.sessionID.slice(0, 12)}</text>
            </box>
          </Show>
        </box>
      </Show>
    </box>
  );
}

const WorkflowPanel: TuiPlugin = async (api) => {
  const [panelState, setPanelState] = createSignal<PanelState>({ kind: "missing" });

  const refresh = () => {
    try {
      const file = join(api.state.path.directory, ".workflow", "state.json");
      if (!existsSync(file)) return setPanelState({ kind: "missing" });
      const workflow = JSON.parse(readFileSync(file, "utf8")) as WorkflowState;
      const dispatch = latestWorker(workflow);
      const status = dispatch?.session_id ? api.state.session.status(dispatch.session_id)?.type ?? "unknown" : "unknown";
      setPanelState({
        kind: "ready",
        workflow,
        worker: dispatch?.session_id
          ? { sessionID: dispatch.session_id, agent: dispatch.agent, stage: dispatch.dispatched_stage, status }
          : undefined,
      });
    } catch {
      setPanelState({ kind: "error" });
    }
  };

  refresh();
  const timer = setInterval(refresh, 1000);
  api.lifecycle.onDispose(() => clearInterval(timer));

  api.slots.register({
    slots: {
      sidebar_content: () => <WorkflowStatus state={panelState} />,
    },
  });
};

export default { tui: WorkflowPanel } satisfies TuiPluginModule;
