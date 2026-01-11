// teleferico-app/src/components/institutional/ActivityShowcase/Loader.tsx
interface Props {
  label: string;
}

export default function Loader({ label }: Props) {
  return (
    <section className="my-12" aria-busy="true" aria-label={label}>
      <div className="relative overflow-hidden rounded-2xl border border-default-200 bg-content1 shadow-sm after:absolute after:inset-x-0 after:top-0 after:h-1 after:bg-red-600">
        <div className="p-5 sm:p-7 lg:p-10">
          {/* Eyebrow */}
          <div className="h-3 w-28 animate-pulse rounded-md bg-default-200 sm:w-32 lg:h-4 lg:w-40" />

          {/* Title */}
          <div className="mt-4 h-9 w-11/12 animate-pulse rounded-md bg-default-200 sm:w-4/5 lg:h-12 lg:w-3/5" />

          {/* Description lines */}
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full animate-pulse rounded-md bg-default-200 lg:h-5" />
            <div className="h-4 w-11/12 animate-pulse rounded-md bg-default-200 lg:h-5 lg:w-10/12" />
            <div className="h-4 w-10/12 animate-pulse rounded-md bg-default-200 lg:h-5 lg:w-9/12" />
          </div>

          {/* Key info grid (4 cards on md+) */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
            <div className="h-24 animate-pulse rounded-xl bg-default-200 lg:h-28" />
            <div className="h-24 animate-pulse rounded-xl bg-default-200 lg:h-28" />
            <div className="h-24 animate-pulse rounded-xl bg-default-200 lg:h-28" />
            <div className="h-24 animate-pulse rounded-xl bg-default-200 lg:h-28" />
          </div>

          {/* Requirements block */}
          <div className="mt-6 h-28 animate-pulse rounded-xl bg-default-200 sm:h-32 lg:h-40" />

          <span className="sr-only" role="status">
            {label}
          </span>
        </div>
      </div>
    </section>
  );
}
