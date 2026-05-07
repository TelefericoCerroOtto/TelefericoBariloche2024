import { Skeleton } from "@heroui/react";

export default function Loading() {
  return (
    <section
      aria-hidden="true"
      className="relative isolate overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-10 text-white shadow-2xl"
    >
      {/* Ornamento superior derecho (placeholder del Gondola) */}
      <div className="pointer-events-none absolute -right-6 -top-10 hidden h-48 w-48 rotate-12 opacity-40 blur-sm md:block">
        <div className="h-full w-full rounded-xl bg-white/10" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3 sm:max-w-2xl">
          <Skeleton className="h-4 w-40 rounded-full bg-white/20" />
          <Skeleton className="h-8 w-64 rounded-md bg-white/20 sm:h-10 sm:w-80" />
          <Skeleton className="h-4 w-72 rounded-md bg-white/15 sm:w-[28rem]" />
        </div>
      </header>

      {/* Caja interna que contiene la grilla */}
      <div className="relative z-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <ul role="list" className="xl:grid-cols-3 grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="h-full">
              <article className="h-full rounded-2xl border border-white/10 bg-white/90 p-6 shadow-sm dark:bg-slate-900/80">
                {/* Título + badge */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-6 w-40 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                {/* Descripción */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                </div>
                {/* Rows de horarios */}
                <div className="mt-6 grid gap-4">
                  <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-100/80 px-4 py-3">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-100/80 px-4 py-3">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
