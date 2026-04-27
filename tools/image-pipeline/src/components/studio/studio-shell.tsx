"use client";

import { useEffect, useMemo, useState } from "react";


import { JobsPanel } from "@/components/studio/jobs/jobs-panel";
import { PreviewPanel } from "@/components/studio/preview/preview-panel";
import { ProcessPanel } from "@/components/studio/process/process-panel";
import { RegistryPanel } from "@/components/studio/registry/registry-panel";
import { StudioHeader } from "@/components/studio/studio-header";
import { AssignmentPanel } from "@/components/studio/workspace/assignment-panel";
import { WorkspaceTree } from "@/components/studio/workspace/workspace-tree";
import { WorkspaceToolbar } from "@/components/studio/workspace-toolbar";

import { useItemSelection } from "@/components/studio/hooks/use-item-selection";
import { usePreview } from "@/components/studio/hooks/use-preview";
import { useProcessRunner } from "@/components/studio/hooks/use-process-runner";
import { useRegistryManager } from "@/components/studio/hooks/use-registry-manager";
import { useWorkspaceManager } from "@/components/studio/hooks/use-workspace-manager";

/* ------------------------------------------------------------------ */
/*  Shell                                                              */
/* ------------------------------------------------------------------ */

export function StudioShell() {
  const [status, setStatus] = useState("Cargando el estudio...");

  /* ---- hooks ----------------------------------------------------- */

  const wsManager = useWorkspaceManager({ onStatus: setStatus });
  const regManager = useRegistryManager({ onStatus: setStatus });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const items = useMemo(
    () => wsManager.workspace?.items ?? [],
    [wsManager.workspace],
  );
  const selection = useItemSelection(items);

  const selectedItems = useMemo(
    () => items.filter((i) => selection.selectedItemIds.includes(i.id)),
    [items, selection.selectedItemIds],
  );

  const preview = usePreview({
    workspaceId: wsManager.workspace?.id,
    activeItem: selection.activeItem,
    registry: regManager.registry,
    onStatus: setStatus,
  });

  const process = useProcessRunner({
    workspaceId: wsManager.workspace?.id,
    onStatus: setStatus,
  });

  const workspaceBusyLabel = wsManager.busyLabel;
  const selectionBusyLabel =
    workspaceBusyLabel &&
    (wsManager.pendingAction === "assign" ||
      wsManager.pendingAction === "deleteItems" ||
      wsManager.pendingAction === "focalPoint")
      ? workspaceBusyLabel
      : undefined;
  /* ---- bootstrap ------------------------------------------------- */

  useEffect(() => {
    void (async () => {
      try {
        setStatus("Cargando el estudio...");
        await regManager.load();
        await wsManager.bootstrap();
        setStatus("Estudio listo.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- derived --------------------------------------------------- */

  const workspaceItemCount = wsManager.workspace?.items.length ?? 0;
  const registryProfileCount = regManager.registry?.profiles.length ?? 0;

  /* ---- render ---------------------------------------------------- */

  return (
    <main className="flex min-h-screen flex-col gap-4 overflow-x-hidden overflow-y-auto bg-slate-950 p-4 text-slate-100">
      <section className="flex-none rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-col gap-5">
          <StudioHeader
            status={status}
            workspacesCount={wsManager.workspaces.length}
            itemCount={workspaceItemCount}
            profileCount={registryProfileCount}
            hasUnsavedProfiles={regManager.isDirty}
            onManageProfiles={() => setIsDrawerOpen((prev) => !prev)}
          />
          <WorkspaceToolbar
            workspaces={wsManager.workspaces}
            activeWorkspaceId={wsManager.workspace?.id}
            isBusy={wsManager.isBusy}
            isDeleting={wsManager.isDeleting}
            isImporting={wsManager.isImporting}
            hasWorkspace={wsManager.workspace !== null}
            busyLabel={workspaceBusyLabel}
            onLoadWorkspace={(id) => void wsManager.loadWorkspace(id)}
            onCreateWorkspace={() => void wsManager.createWorkspace()}
            onRenameWorkspace={(newTitle) => void wsManager.updateWorkspace({ type: "setTitle", title: newTitle })}
            onDeleteWorkspace={() => void wsManager.deleteCurrentWorkspace()}
            onImportFiles={(files) => void wsManager.importFiles(files)}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(24rem,28rem)_minmax(0,1fr)] xl:items-start">
        <div className="flex h-full flex-col gap-4">
          <WorkspaceTree
            items={items}
            selectedItemIds={selection.selectedItemIds}
            activeItemId={selection.activeItemId}
            isBusy={wsManager.isBusy}
            busyLabel={selectionBusyLabel}
            onToggleSelected={selection.toggleSelected}
            onSetActive={selection.setActiveItemId}
            onSetSelected={selection.setSelectedItemIds}
            onDeleteSelected={async (itemIds) => {
              if (!window.confirm(`¿Eliminar ${itemIds.length} ítem(s) del espacio?`)) return;
              await wsManager.updateWorkspace({ type: "deleteItems", itemIds });
              selection.setSelectedItemIds([]);
            }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:auto-rows-[minmax(22rem,auto)]">
          <PreviewPanel
            activeItem={selection.activeItem}
            activeSlotId={preview.activeSlotId}
            availableSlots={preview.availableSlots}
            previewUrl={preview.previewUrl}
            previewMeta={preview.previewMeta}
            isLoading={preview.isLoading}
            isInteractionDisabled={!selection.activeItem || wsManager.isBusy || preview.isLoading}
            onSelectSlot={preview.setActiveSlotId}
            onFocalPointChange={async (point) => {
              if (!selection.activeItem) return;
              await wsManager.updateWorkspace({
                type: "setFocalPoint",
                itemId: selection.activeItem.id,
                focalPoint: point,
              });
            }}
          />
          <AssignmentPanel
            registry={regManager.registry}
            selectedItems={selectedItems}
            activeItem={selection.activeItem}
            isBusy={wsManager.isBusy}
            busyLabel={selectionBusyLabel}
            onBulkAssign={async (profileId) => {
              if (selection.selectedItemIds.length === 0) return;
              await wsManager.updateWorkspace({
                type: "bulkAssign",
                itemIds: selection.selectedItemIds,
                profileId,
              });
            }}
            onAssignActive={async (profileId) => {
              if (!selection.activeItem) return;
              await wsManager.updateWorkspace({
                type: "setItemProfile",
                itemId: selection.activeItem.id,
                profileId,
              });
            }}
          />
          <ProcessPanel
            logs={process.logs}
            outputs={process.outputs}
            isRunning={process.isRunning}
            pendingMode={process.pendingMode}
            onRun={process.runProcess}
          />
          <JobsPanel
            jobsText={wsManager.jobsText}
            isBusy={wsManager.isBusy}
            pendingAction={wsManager.pendingJobsAction}
            onChange={wsManager.setJobsText}
            onGenerate={() => wsManager.runJobsAction("generate")}
            onValidate={() => wsManager.runJobsAction("validate")}
            onRehydrate={() => wsManager.runJobsAction("rehydrate")}
          />
        </div>
      </div>

      {/* Native Tailwind Sidebar for Profiles */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
      
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-300 ease-in-out sm:w-[38rem] ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <RegistryPanel
          registry={regManager.registry}
          isDirty={regManager.isDirty}
          isSaving={regManager.isSaving}
          dirtyProfileIds={regManager.dirtyProfileIds}
          onChange={regManager.setRegistry}
          onSave={regManager.save}
          onClose={() => setIsDrawerOpen(false)}
        />
      </aside>
    </main>
  );
}
