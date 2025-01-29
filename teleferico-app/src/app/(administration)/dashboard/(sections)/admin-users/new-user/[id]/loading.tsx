import { Skeleton } from "@nextui-org/react";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="rounded-lg">
        <div className="h-12 rounded-lg bg-default-300" />
      </Skeleton>
      <Skeleton className="rounded-lg">
        <div className="h-12 rounded-lg bg-default-300" />
      </Skeleton>
      <Skeleton className="rounded-lg">
        <div className="h-12 rounded-lg bg-default-300" />
      </Skeleton>
      <Skeleton className="rounded-lg">
        <div className="h-12 rounded-lg bg-default-300" />
      </Skeleton>
      <Skeleton className="rounded-lg">
        <div className="h-12 rounded-lg bg-default-300" />
      </Skeleton>
    </div>
  );
}
