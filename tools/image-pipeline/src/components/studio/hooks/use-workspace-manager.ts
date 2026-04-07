"use client";

import { useState } from "react";

import { fetchJson } from "@/lib/studio/api-client";
import type { WorkspaceManifest, WorkspacePayload, WorkspaceSummary } from "@/lib/studio/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UseWorkspaceManagerOptions {
  onStatus: (message: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useWorkspaceManager({ onStatus }: UseWorkspaceManagerOptions) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceManifest | null>(null);
  const [jobsText, setJobsText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  /* ---- internal helpers ------------------------------------------ */

  async function loadWorkspace(workspaceId: string) {
    const data = await fetchJson<WorkspacePayload>(
      `/api/workspaces/${workspaceId}`,
    );
    setWorkspace(data.workspace);
    setJobsText(data.jobsText);
  }

  async function loadWorkspaces(preferredId?: string) {
    const data = await fetchJson<{ workspaces: WorkspaceSummary[] }>("/api/workspaces");
    setWorkspaces(data.workspaces);
    const nextId = preferredId ?? workspace?.id ?? data.workspaces[0]?.id;
    if (nextId) {
      await loadWorkspace(nextId);
    }
  }

  /**
   * Loads the workspace list and activates the first one. If no
   * workspaces exist, creates a default one. Shared by bootstrap and
   * delete to eliminate the duplicated "ensure at least one" pattern.
   */
  async function ensureWorkspace() {
    const data = await fetchJson<{ workspaces: WorkspaceSummary[] }>("/api/workspaces");
    setWorkspaces(data.workspaces);

    if (data.workspaces.length > 0) {
      await loadWorkspace(data.workspaces[0]!.id);
    } else {
      const created = await fetchJson<{ workspace: WorkspaceManifest }>("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadWorkspaces(created.workspace.id);
    }
  }

  /* ---- public API ------------------------------------------------ */

  async function bootstrap() {
    await ensureWorkspace();
  }

  async function createWorkspace() {
    const data = await fetchJson<{ workspace: WorkspaceManifest }>("/api/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    await loadWorkspaces(data.workspace.id);
    onStatus("Espacio creado.");
  }

  async function deleteCurrentWorkspace() {
    if (!workspace) return;
    const confirmed = window.confirm(
      `¿Eliminar el espacio "${workspace.title}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    try {
      setIsDeleting(true);
      await fetchJson(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
      await ensureWorkspace();
      onStatus("Espacio eliminado.");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDeleting(false);
    }
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

    const data = await fetchJson<WorkspacePayload>(
      `/api/workspaces/${workspace.id}/import`,
      { method: "POST", body: formData },
    );
    setWorkspace(data.workspace);
    setJobsText(data.jobsText);
    onStatus(`${fileList.length} archivo(s) importado(s).`);
    await loadWorkspaces(workspace.id);
  }

  async function updateWorkspace(body: unknown) {
    if (!workspace) return;
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
    await loadWorkspaces(workspace.id);
  }

  async function runJobsAction(action: "generate" | "validate" | "rehydrate") {
    if (!workspace) return;
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
  }

  return {
    workspaces,
    workspace,
    jobsText,
    setJobsText,
    isDeleting,
    loadWorkspace,
    bootstrap,
    createWorkspace,
    deleteCurrentWorkspace,
    importFiles,
    updateWorkspace,
    runJobsAction,
  };
}
