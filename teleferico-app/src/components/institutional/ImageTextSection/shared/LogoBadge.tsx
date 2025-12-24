import Image from "next/image";
import gondola from "@/public/gondola.svg";

export default function LogoBadge() {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30"
    >
      <Image
        src={gondola}
        alt=""
        className="h-5 w-5 text-red-600"
        width={20}
        height={20}
        aria-hidden="true"
        sizes="40px"
      />
    </span>
  );
}
