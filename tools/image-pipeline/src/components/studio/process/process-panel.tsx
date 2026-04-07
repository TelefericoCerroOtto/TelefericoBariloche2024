"use client";

import { Button } from "@heroui/react";

type ProcessPanelProps = {
  logs: string[];
  outputs: string[];
  onRun: (dryRun?: boolean) => Promise<void>;
};

export function ProcessPanel({ logs, outputs, onRun }: ProcessPanelProps) {
  return (
    <section className="flex h-full min-h-[22rem] flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.95)]">
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h2 className="text-base font-semibold text-slate-100">Procesamiento</h2>
        <p className="text-sm text-slate-400">Usa el mismo pipeline de Sharp que la CLI.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onPress={() => void onRun(false)}>
          Ejecutar
        </Button>
        <Button size="sm" variant="secondary" onPress={() => void onRun(true)}>
          Simulación
        </Button>
      </div>

      <div className="mt-4 grid min-h-0 flex-1 gap-3 xl:grid-cols-2">
        <div className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <strong className="text-sm font-semibold text-slate-100">Salidas</strong>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {outputs.length === 0 ? (
              <span className="text-sm text-slate-400">Sin salidas todavía.</span>
            ) : null}
            {outputs.map((output) => (
              <code key={output} className="text-xs text-emerald-400">
                {output}
              </code>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <strong className="text-sm font-semibold text-slate-100">Registros</strong>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {logs.length === 0 ? (
              <span className="text-sm text-slate-400">Sin registros de ejecución todavía.</span>
            ) : null}
            {logs.map((line, index) => (
              <code key={`${line}-${index}`} className="text-xs text-slate-300">
                {line}
              </code>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
