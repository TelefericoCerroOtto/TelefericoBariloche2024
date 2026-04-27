import { STUDIO_LOCAL_ONLY_NOTICE } from "@/lib/studio/capabilities";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StudioHeaderProps {
  status: string;
  workspacesCount: number;
  itemCount: number;
  profileCount: number;
  hasUnsavedProfiles?: boolean;
  onManageProfiles: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StudioHeader({
  status,
  workspacesCount,
  itemCount,
  profileCount,
  hasUnsavedProfiles,
  onManageProfiles,
}: StudioHeaderProps) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-400">
          Herramienta local
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-50">
            Estudio del pipeline de imágenes
          </h1>
          <p className="max-w-3xl text-sm text-slate-400">{STUDIO_LOCAL_ONLY_NOTICE}</p>
        </div>
        <p className="text-sm text-slate-300">{status}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[30rem]">
        <StatCard label="Espacios" value={workspacesCount} />
        <StatCard label="Ítems" value={itemCount} />
        <StatCard 
          label="Perfiles" 
          value={profileCount} 
          hasWarning={hasUnsavedProfiles}
          onPress={onManageProfiles} 
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  hasWarning,
  onPress,
}: {
  label: string;
  value: number;
  hasWarning?: boolean;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={`group relative w-full rounded-2xl border ${hasWarning ? 'border-amber-500/50 bg-amber-950/20 hover:border-amber-400 hover:bg-amber-900/30' : 'border-slate-800 bg-slate-900/70 hover:border-slate-600 hover:bg-slate-800/80'} p-4 text-left transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500`}
      >
        <div className="flex items-center justify-between">
          <p className={`text-xs uppercase tracking-[0.18em] flex items-center gap-2 transition-colors ${hasWarning ? 'text-amber-500/80' : 'text-slate-500 group-hover:text-slate-400'}`}>
            {label}
            {hasWarning && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
          </p>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${hasWarning ? 'text-amber-500' : 'text-slate-600 group-hover:text-slate-300'} transition-colors`}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <p className={`text-2xl font-semibold ${hasWarning ? 'text-amber-50' : 'text-slate-50'}`}>{value}</p>
          {hasWarning && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Cambios sin guardar</span>
          )}
        </div>
      </button>
    );
  }
  return (
    <div className={`relative rounded-2xl border ${hasWarning ? 'border-amber-500/50 bg-amber-950/20' : 'border-slate-800 bg-slate-900/70'} p-4`}>
      <p className={`text-xs uppercase tracking-[0.18em] flex items-center gap-2 ${hasWarning ? 'text-amber-500/80' : 'text-slate-500'}`}>
        {label}
        {hasWarning && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      </p>
      <div className="mt-2 flex items-baseline justify-between">
        <p className={`text-2xl font-semibold ${hasWarning ? 'text-amber-50' : 'text-slate-50'}`}>{value}</p>
        {hasWarning && (
           <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Cambios sin guardar</span>
        )}
      </div>
    </div>
  );
}
