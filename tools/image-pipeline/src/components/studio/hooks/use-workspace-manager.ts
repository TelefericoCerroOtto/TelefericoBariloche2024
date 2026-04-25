"use client";

import { useState } from "react";

import { FOCAL_POINT_BUSY_LABEL } from "@/components/studio/busy-labels";
import { fetchJson } from "@/lib/studio/api-client";
import type { WorkspaceManifest, WorkspacePayload, WorkspaceSummary } from "@/lib/studio/types";
import type { WorkspaceUpdateBody } from "@/lib/studio/workspace-updates";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UseWorkspaceManagerOptions {
  onStatus: (message: string) => void;
}

type WorkspacePendingAction =
  | "bootstrap"
  | "load"
  | "create"
  | "rename"
  | "delete"
  | "import"
  | "deleteItems"
  | "assign"
  | "focalPoint"
  | "generate"
  | "validate"
  | "rehydrate";

type JobsPendingAction = "generate" | "validate" | "rehydrate";

function getWorkspaceBusyLabel(action: WorkspacePendingAction | null) {
  switch (action) {
    case "bootstrap":
      return "Cargando espacios de trabajo...";
    case "load":
      return "Cargando espacio de trabajo...";
    case "create":
      return "Creando espacio de trabajo...";
    case "rename":
      return "Renombrando espacio...";
    case "delete":
      return "Eliminando espacio...";
    case "import":
      return "Importando archivos...";
    case "deleteItems":
      return "Eliminando elementos seleccionados...";
    case "assign":
      return "Aplicando perfiles...";
    case "focalPoint":
      return FOCAL_POINT_BUSY_LABEL;
    case "generate":
      return "Generando jobs.json...";
    case "validate":
      return "Validando jobs.json...";
    case "rehydrate":
      return "Recargando espacio desde jobs.json...";
    default:
      return undefined;
  }
}

function getWorkspaceUpdateAction(body: WorkspaceUpdateBody): WorkspacePendingAction {
  switch (body.type) {
    case "setTitle":
      return "rename";
    case "deleteItems":
      return "deleteItems";
    case "bulkAssign":
    case "setItemProfile":
      return "assign";
    case "setFocalPoint":
      return "focalPoint";
  }
}

function isJobsPendingAction(action: WorkspacePendingAction | null): action is JobsPendingAction {
  return action === "generate" || action === "validate" || action === "rehydrate";
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useWorkspaceManager({ onStatus }: UseWorkspaceManagerOptions) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceManifest | null>(null);
  const [jobsText, setJobsText] = useState("");
  const [pendingAction, setPendingAction] = useState<WorkspacePendingAction | null>(null);

  /* ---- internal helpers ------------------------------------------ */

  async function loadWorkspaceData(workspaceId: string) {
    const data = await fetchJson<WorkspacePayload>(
      `/api/workspaces/${workspaceId}`,
    );
    setWorkspace(data.workspace);
    setJobsText(data.jobsText);
  }

  async function loadWorkspacesData(preferredId?: string) {
    const data = await fetchJson<{ workspaces: WorkspaceSummary[] }>("/api/workspaces");
    setWorkspaces(data.workspaces);
    const nextId = preferredId ?? workspace?.id ?? data.workspaces[0]?.id;
    if (nextId) {
      await loadWorkspaceData(nextId);
    }
  }

  async function runWorkspaceAction<T>(
    action: WorkspacePendingAction,
    task: () => Promise<T>,
    options?: { rethrow?: boolean },
  ) {
    setPendingAction(action);
    try {
      return await task();
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
      if (options?.rethrow) {
        throw error;
      }
      return undefined;
    } finally {
      setPendingAction(null);
    }
  }

  /**
   * Loads the workspace list and activates the first one. If no
   * workspaces exist, creates a default one. Shared by bootstrap and
   * delete to eliminate the duplicated "ensure at least one" pattern.
   */
  async function ensureWorkspaceData() {
    const data = await fetchJson<{ workspaces: WorkspaceSummary[] }>("/api/workspaces");
    setWorkspaces(data.workspaces);

    if (data.workspaces.length > 0) {
      await loadWorkspaceData(data.workspaces[0]!.id);
    } else {
      const created = await fetchJson<{ workspace: WorkspaceManifest }>("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadWorkspacesData(created.workspace.id);
    }
  }

  /* ---- public API ------------------------------------------------ */

  async function bootstrap() {
    await runWorkspaceAction("bootstrap", ensureWorkspaceData, { rethrow: true });
  }

  async function loadWorkspace(workspaceId: string) {
    await runWorkspaceAction("load", () => loadWorkspaceData(workspaceId));
  }

  async function createWorkspace() {
    await runWorkspaceAction("create", async () => {
      const data = await fetchJson<{ workspace: WorkspaceManifest }>("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadWorkspacesData(data.workspace.id);
      onStatus("Espacio creado.");
    });
  }

  async function deleteCurrentWorkspace() {
    if (!workspace) return;
    const confirmed = window.confirm(
      `¿Eliminar el espacio "${workspace.title}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    await runWorkspaceAction("delete", async () => {
      await fetchJson(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
      await ensureWorkspaceData();
      onStatus("Espacio eliminado.");
    });
  }

  async function importFiles(fileList: FileList | null) {
    if (!workspace || !fileList || fileList.length === 0) return;

    const formData = new FormData();
    for (const file of Array.from(fileList)) {
      const candidate = file as File & { webkitRelativePath?: string };
      formData.append(
        "files",
        file,
        candidate.webkitRelativePath && candidate.webkitRelativePath.length > 0
          ? candidate.webkitRelativePath
          : file.name,
      );
    }

    await runWorkspaceAction("import", async () => {
      const data = await fetchJson<WorkspacePayload>(
        `/api/workspaces/${workspace.id}/import`,
        { method: "POST", body: formData },
      );
      setWorkspace(data.workspace);
      setJobsText(data.jobsText);
      onStatus(`${fileList.length} archivo(s) importado(s).`);
      await loadWorkspacesData(workspace.id);
    });
  }

  async function updateWorkspace(body: WorkspaceUpdateBody) {
    if (!workspace) return;
    await runWorkspaceAction(getWorkspaceUpdateAction(body), async () => {
      const data = await fetchJson<WorkspacePayload>(
        `/api/workspaces/${workspace.id}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      setWorkspace(data.workspace);
      setJobsText(data.jobsText);
      await loadWorkspacesData(workspace.id);
    });
  }

  async function runJobsAction(action: JobsPendingAction) {
    if (!workspace) return;
    await runWorkspaceAction(action, async () => {
      const data = await fetchJson<{ jobsText: string; workspace?: WorkspaceManifest }>(
        `/api/workspaces/${workspace.id}/jobs`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            action === "generate" ? { action } : { action, text: jobsText },
          ),
        },
      );
      setJobsText(data.jobsText);
      if (data.workspace) setWorkspace(data.workspace);
      onStatus(
        action === "generate"
          ? "jobs.json generado desde el espacio de trabajo."
          : action === "validate"
            ? "jobs.json validado."
            : "Espacio recargado desde jobs.json.",
      );
    });
  }

  return {
    workspaces,
    workspace,
    jobsText,
    setJobsText,
    pendingAction,
    isBusy: pendingAction !== null,
    isDeleting: pendingAction === "delete",
    isImporting: pendingAction === "import",
    pendingJobsAction: isJobsPendingAction(pendingAction) ? pendingAction : null,
    busyLabel: getWorkspaceBusyLabel(pendingAction),
    loadWorkspace,
    bootstrap,
    createWorkspace,
    deleteCurrentWorkspace,
    importFiles,
    updateWorkspace,
    runJobsAction,
  };
}
