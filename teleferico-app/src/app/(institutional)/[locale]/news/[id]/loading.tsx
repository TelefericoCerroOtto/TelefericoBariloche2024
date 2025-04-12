import { Skeleton } from "@nextui-org/react";

export default function Loading() {
  return (
    <div className="flex h-full w-full flex-col items-center">
      <Skeleton className="mb-10 h-12 w-3/4" />
      <Skeleton className="mb-8 h-6 w-2/4" />
      <Skeleton className="mb-14 h-6 w-1/4" />
      <Skeleton className="h-80 w-10/12" />
    </div>
  );
}
