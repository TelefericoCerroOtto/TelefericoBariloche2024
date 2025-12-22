import { Skeleton } from "@/components/ui/skeleton";

const cardPlaceholders = Array.from({ length: 6 });

export function CardLoader() {
  return (
    <section
      aria-label="Loading news"
      aria-busy="true"
      role="status"
      className="w-full px-6 py-12 sm:px-10 lg:px-20"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-56 rounded-full" />
          <Skeleton className="h-4 w-80 max-w-full rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {cardPlaceholders.map((_, index) => (
            <div key={index} className="flex h-full flex-col gap-4">
              <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
              <Skeleton className="h-5 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturedNewLoader() {
  return (
    <section
      aria-label="Loading featured news"
      aria-busy="true"
      role="status"
      className="w-full px-6 py-12 sm:px-10 lg:px-20"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex w-full flex-1 flex-col gap-4">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-12 w-full rounded-3xl sm:w-11/12" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
          <Skeleton className="h-4 w-5/6 rounded-full" />
          <div className="flex gap-4">
            <Skeleton className="h-11 w-32 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
          </div>
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-3xl lg:w-1/2" />
      </div>
    </section>
  );
}
