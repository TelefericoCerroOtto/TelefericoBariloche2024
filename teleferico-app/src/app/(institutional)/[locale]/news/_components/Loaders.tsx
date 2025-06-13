import { Skeleton } from "@heroui/react";

export function CardLoader() {
  return (
    <div className="grid h-full w-full grid-cols-1 gap-8 px-10 sm:grid-cols-2 sm:px-20 md:grid-cols-3 lg:grid-cols-4 lg:px-40">
      <div className="flex w-full max-w-[300px] flex-col gap-3">
        <div className="aspect-square w-full">
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="h-8 w-10/12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-10/12" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="flex w-full max-w-[300px] flex-col gap-3">
        <div className="aspect-square w-full">
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="h-8 w-10/12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-10/12" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="flex w-full max-w-[300px] flex-col gap-3">
        <div className="aspect-square w-full">
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="h-8 w-10/12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-10/12" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="flex w-full max-w-[300px] flex-col gap-3">
        <div className="aspect-square w-full">
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="h-8 w-10/12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-10/12" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}

export function FeaturedNewLoader() {
  return (
    <div className="flex h-full w-full flex-col items-center">
      <Skeleton className="mb-10 h-12 w-3/4" />
      <Skeleton className="mb-8 h-6 w-2/4" />
      <Skeleton className="mb-14 h-6 w-1/4" />
      <Skeleton className="h-80 w-10/12" />
    </div>
  );
}
