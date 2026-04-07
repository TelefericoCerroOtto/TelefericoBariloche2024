"use client";

import { Button, TextArea } from "@heroui/react";

type JobsPanelProps = {
  jobsText: string;
  onChange: (value: string) => void;
  onGenerate: () => Promise<void>;
  onValidate: () => Promise<void>;
  onRehydrate: () => Promise<void>;
};

export function JobsPanel({
  jobsText,
  onChange,
  onGenerate,
  onValidate,
  onRehydrate,
}: JobsPanelProps) {
  return (
    <section className="flex h-full min-h-[22rem] flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.95)]">
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h2 className="text-base font-semibold text-slate-100">jobs.json</h2>
        <p className="text-sm text-slate-400">
          Contrato canónico para la vista previa y el procesamiento.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onPress={() => void onGenerate()}>
          Generar desde el espacio
        </Button>
        <Button size="sm" variant="secondary" onPress={() => void onValidate()}>
          Validar JSON
        </Button>
        <Button size="sm" variant="secondary" onPress={() => void onRehydrate()}>
          Guardar y recargar
        </Button>
      </div>
      <TextArea
        className="mt-4 min-h-0 flex-1 font-mono text-xs"
        value={jobsText}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label="jobs.json"
      />
    </section>
  );
}
