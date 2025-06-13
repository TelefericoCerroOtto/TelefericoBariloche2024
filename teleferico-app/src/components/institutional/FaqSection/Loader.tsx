import { Skeleton } from "@heroui/react";

function FaqLoader() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 rounded-lg" />
      <Skeleton className="h-4 rounded-lg" />
      <Skeleton className="h-4 w-3/4 rounded-lg" />
      <Skeleton className="h-4 rounded-lg" />
      <Skeleton className="h-4 w-2/5 rounded-lg" />
    </div>
  );
}

export default function Loader() {
  return (
    <section className="w-full px-6 md:px-6 lg:px-16">
      <div className="grid max-w-[1536px] grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-14">
        <FaqLoader />
        <FaqLoader />
        <FaqLoader />
        <FaqLoader />
      </div>
    </section>
  );
}
