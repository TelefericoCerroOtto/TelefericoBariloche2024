// app/[locale]/(admin)/recruitment/loading.tsx

export default function LoadingRecruitmentPage() {
  return (
    <div className="flex w-full flex-col gap-4 p-6">
      {/* Título / encabezado */}
      <div className="h-7 w-40 animate-pulse rounded-md bg-default-200" />

      {/* Tabs / filtros */}
      <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-default-100" />

      {/* Tabla */}
      <div className="h-72 w-full animate-pulse rounded-md bg-default-100" />
    </div>
  );
}
