import { InputSkeleton } from "@/components";

export default function Fallback() {
  return (
    <div className="grid flex-grow grid-cols-1 gap-4">
      <InputSkeleton />
      <InputSkeleton />
      <InputSkeleton />
    </div>
  );
}
