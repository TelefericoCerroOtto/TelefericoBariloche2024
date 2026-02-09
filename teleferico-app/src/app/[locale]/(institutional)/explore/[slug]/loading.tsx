import { Skeleton } from "@heroui/react";

export default function Loading() {
  const lines = Array.from({ length: 6 });

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Skeleton className="h-10 w-3/4 max-w-3xl" />
      <Skeleton className="h-5 w-2/3 max-w-2xl" />
      <Skeleton className="h-64 w-full max-w-5xl rounded-xl" />
      <div className="flex w-full max-w-4xl flex-col gap-3">
        {lines.map((_, index) => (
          <Skeleton
            key={index}
            className={index === lines.length - 1 ? "h-4 w-2/3" : "h-4 w-full"}
          />
        ))}
      </div>
    </div>
  );
}
