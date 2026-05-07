"use client";

import { useState } from "react";

import { fetchJson } from "@/lib/studio/api-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UseProcessRunnerOptions {
  workspaceId: string | undefined;
  onStatus: (message: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Manages process execution (dry run / real) and its output state.
 */
export function useProcessRunner({ workspaceId, onStatus }: UseProcessRunnerOptions) {
  const [logs, setLogs] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [pendingMode, setPendingMode] = useState<"run" | "dryRun" | null>(null);

  async function runProcess(dryRun?: boolean) {
    if (!workspaceId) return;
    const nextMode = dryRun ? "dryRun" : "run";

    setPendingMode(nextMode);
    try {
      const data = await fetchJson<{ logs: string[]; outputs: string[] }>(
        `/api/workspaces/${workspaceId}/process`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dryRun }),
        },
      );
      setLogs(data.logs);
      setOutputs(data.outputs);
      onStatus(dryRun ? "Simulación completa." : "Procesamiento completo.");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingMode(null);
    }
  }

  return {
    logs,
    outputs,
    runProcess,
    pendingMode,
    isRunning: pendingMode !== null,
    busyLabel:
      pendingMode === "run"
        ? "Procesando imágenes..."
        : pendingMode === "dryRun"
          ? "Ejecutando simulación..."
          : undefined,
  };
}
