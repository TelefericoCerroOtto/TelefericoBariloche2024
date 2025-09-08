import { Skeleton } from "@heroui/react";

export default function Loader() {
  return (
    <div className="flex h-full w-full flex-col">
      <Skeleton className="mb-8 h-6 w-3/4" />
      <Skeleton className="mb-8 h-6 w-2/4" />
      <Skeleton className="mb-8 h-6 w-1/4" />
      <Skeleton className="mb-8 h-6 w-full" />
      <Skeleton className="mb-8 h-6 w-3/4" />
      <Skeleton className="mb-8 h-6 w-2/4" />
      <Skeleton className="mb-8 h-6 w-1/4" />
      <Skeleton className="mb-8 h-6 w-full" />
    </div>
  );
}
