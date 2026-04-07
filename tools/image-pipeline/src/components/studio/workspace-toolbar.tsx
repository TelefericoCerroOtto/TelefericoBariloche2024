"use client";

import { useEffect, useRef } from "react";

import { Button, Label, ListBox, Select } from "@heroui/react";

import { studioSelectStyles } from "@/components/studio/select-styles";
import type { WorkspaceSummary } from "@/lib/studio/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WorkspaceToolbarProps {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | undefined;
  isDeleting: boolean;
  hasWorkspace: boolean;
  onLoadWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
  onRenameWorkspace: (newTitle: string) => void;
  onDeleteWorkspace: () => void;
  onImportFiles: (files: FileList | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WorkspaceToolbar({
  workspaces,
  activeWorkspaceId,
  isDeleting,
  hasWorkspace,
  onLoadWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onImportFiles,
}: WorkspaceToolbarProps) {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-[minmax(22rem,1fr)_auto]">
        <Select
          className="min-w-0 self-start"
          value={activeWorkspaceId ?? null}
          onChange={(key) => key && void onLoadWorkspace(String(key))}
          placeholder="Seleccionar espacio"
          aria-label="Espacio activo"
          variant="secondary"
        >
          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Espacio activo
          </Label>
          <Select.Trigger className={studioSelectStyles.trigger}>
            <Select.Value className={studioSelectStyles.value} />
            <Select.Indicator className={studioSelectStyles.indicator} />
          </Select.Trigger>
          <Select.Popover className={studioSelectStyles.popover}>
            <ListBox className={studioSelectStyles.listBox}>
              {workspaces.map((summary) => (
                <ListBox.Item
                  key={summary.id}
                  id={summary.id}
                  textValue={`${summary.title} (${summary.itemCount})`}
                >
                  {summary.title} ({summary.itemCount})
                  <ListBox.ItemIndicator className={studioSelectStyles.itemIndicator} />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <div className="flex flex-wrap items-end gap-2 xl:justify-end">
          <Button size="sm" variant="secondary" onPress={() => void onCreateWorkspace()}>
            Nuevo espacio
          </Button>
          {hasWorkspace ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  const active = workspaces.find((w) => w.id === activeWorkspaceId);
                  const newTitle = window.prompt("Renombrar espacio de trabajo:", active?.title);
                  if (newTitle && newTitle.trim() !== "" && newTitle.trim() !== active?.title) {
                    onRenameWorkspace(newTitle.trim());
                  }
                }}
              >
                Renombrar
              </Button>
              <Button
                size="sm"
                variant="danger-soft"
                isDisabled={isDeleting}
                onPress={() => void onDeleteWorkspace()}
              >
                {isDeleting ? "Eliminando..." : "Eliminar espacio"}
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="secondary" onPress={() => folderInputRef.current?.click()}>
            Importar carpeta
          </Button>
          <Button size="sm" variant="secondary" onPress={() => fileInputRef.current?.click()}>
            Importar archivos
          </Button>
        </div>
      </div>
      <input
        hidden
        multiple
        ref={folderInputRef}
        type="file"
        onChange={(event) => void onImportFiles(event.target.files)}
      />
      <input
        hidden
        multiple
        ref={fileInputRef}
        type="file"
        onChange={(event) => void onImportFiles(event.target.files)}
      />
    </>
  );
}
