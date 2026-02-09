import { Skeleton } from "@heroui/react";

export default function Loading() {
  const cards = Array.from({ length: 4 });

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Skeleton className="h-10 w-3/4 max-w-3xl" />
      <Skeleton className="h-5 w-2/3 max-w-2xl" />
      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {cards.map((_, index) => (
          <div key={index} className="flex flex-col gap-3">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
