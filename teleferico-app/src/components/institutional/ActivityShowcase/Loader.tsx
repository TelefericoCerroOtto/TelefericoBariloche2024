// teleferico-app/src/components/institutional/ActivityShowcase/Loader.tsx
interface Props {
  label: string;
}

export default function Loader({ label }: Props) {
  return (
    <section
      className="my-12 w-11/12 md:w-3/4 lg:w-7/12"
      aria-busy="true"
      aria-label={label}
    >
      <div className="relative w-full overflow-hidden rounded-2xl border border-default-200 bg-content1 shadow-sm after:absolute after:inset-x-0 after:top-0 after:h-1 after:bg-red-600">
        <div className="p-5 sm:p-7 lg:p-10">
          {/* Header (igual estructura que el real) */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              {/* Eyebrow */}
              <div className="h-4 w-28 animate-pulse rounded-md bg-default-200 sm:h-5 sm:w-36" />

              {/* Title */}
              <div className="mt-2 h-8 w-11/12 animate-pulse rounded-md bg-default-200 sm:h-10 sm:w-4/5 lg:h-14 lg:w-3/5" />
            </div>

            {/* Availability pill */}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-default-200 bg-default-50 px-3 py-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-default-200" />
              <div className="h-4 w-24 animate-pulse rounded-md bg-default-200 sm:h-5 sm:w-28" />
            </div>
          </div>

          {/* Description (mismas proporciones que el <p> real) */}
          <div className="mt-4 space-y-2 sm:space-y-3">
            <div className="h-4 w-full animate-pulse rounded-md bg-default-200 sm:h-5 lg:h-7" />
            <div className="h-4 w-11/12 animate-pulse rounded-md bg-default-200 sm:h-5 lg:h-7" />
            <div className="h-4 w-10/12 animate-pulse rounded-md bg-default-200 sm:h-5 lg:h-7" />
          </div>

          {/* Key info grid (cards como las reales) */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-default-200 bg-default-50 p-4"
              >
                <div className="h-4 w-20 animate-pulse rounded-md bg-default-200 sm:h-5 sm:w-24" />
                <div className="mt-2 h-5 w-24 animate-pulse rounded-md bg-default-200 sm:h-6 sm:w-28 lg:h-7 lg:w-32" />
                <div className="mt-2 h-3 w-28 animate-pulse rounded-md bg-default-200 sm:h-4 sm:w-32" />
              </div>
            ))}
          </div>

          {/* Requirements (igual wrapper que el real: bg-content2 + border + padding) */}
          <div className="mt-6 rounded-xl border border-default-200 bg-content2 p-4 sm:p-5">
            <div className="h-4 w-28 animate-pulse rounded-md bg-default-200 sm:h-5 sm:w-36 lg:h-6" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded-md bg-default-200 sm:h-5" />
              <div className="h-4 w-11/12 animate-pulse rounded-md bg-default-200 sm:h-5" />
              <div className="h-4 w-10/12 animate-pulse rounded-md bg-default-200 sm:h-5" />
            </div>
          </div>

          <span className="sr-only" role="status">
            {label}
          </span>
        </div>
      </div>
    </section>
  );
}
