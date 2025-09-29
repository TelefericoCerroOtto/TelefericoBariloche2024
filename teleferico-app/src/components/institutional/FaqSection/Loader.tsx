import { Skeleton } from "@heroui/react";

function FaqLoader() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/70 p-6 shadow-sm">
      <Skeleton className="h-7 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-4/5 rounded-lg" />
      <Skeleton className="h-4 w-3/5 rounded-lg" />
    </div>
  );
}

export default function Loader() {
  return (
    <section className="w-full px-6 py-8 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <FaqLoader />
        <FaqLoader />
        <FaqLoader />
        <FaqLoader />
      </div>
    </section>
  );
}
