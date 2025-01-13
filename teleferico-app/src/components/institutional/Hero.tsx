import { ImageType } from "@/types/api";
import { titleStyles } from "@/utils/styles";
import Image from "next/image";
import { type ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  image: ImageType;
  children?: ReactNode;
}

export default function Hero(props: Props) {
  const { children, title, description, image } = props;

  return (
    <section className="relative mb-14 h-screen max-h-[800px] w-screen">
      <div className="h-full w-full md:h-3/4 lg:h-1/2">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="z-0 object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-65" />
        <div className="absolute left-1/2 right-auto z-10 flex h-full w-3/4 max-w-[1536px] -translate-x-1/2 transform flex-col justify-end gap-6 pb-16 text-white">
          <h1 {...titleStyles}>{title}</h1>
          <p className="text-inherit">{description}</p>
          <div className="flex gap-4">{children ?? null}</div>
        </div>
      </div>
    </section>
  );
}
