import type { New } from "@/types/api";
import Image from "next/image";
import Link from "next/link";

interface Props {
  item: New;
}

export default function Card(props: Props) {
  const { item } = props;

  return (
    <Link
      href={`/news/${item.id}`}
      className="group flex w-full max-w-[300px] flex-col gap-3 hover:cursor-pointer"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={item.images.thumbnail.src}
          alt={item.images.thumbnail.alt}
          fill
          className="transform object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      <p className="text-lg font-semibold text-inherit transition-colors duration-200 group-hover:text-custom-red group-hover:underline">
        {item.title}
      </p>
      <p>{item.summary}</p>
    </Link>
  );
}
