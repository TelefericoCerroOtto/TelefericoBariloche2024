import { ImageType } from "@/types";
import { titleStyles } from "@/utils/styles";
import Image from "next/image";
import { type ReactNode } from "react";

interface Props {
  title?: string;
  description?: string;
  image: ImageType;
  children?: ReactNode;
  align?: "bottom" | "center";
}

export default function Hero(props: Props) {
  const { children, title, description, image, align = "bottom" } = props;

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
        <div
          className={`absolute z-10 flex h-full w-5/6 max-w-[1536px] gap-6 pb-16 text-white sm:w-3/4 ${align === "bottom" ? "justify-end" : "justify-center"} left-1/2 right-auto -translate-x-1/2 transform flex-col`}
        >
          {title ? <h1 {...titleStyles}>{title}</h1> : null}
          {description ? <p className="text-inherit">{description}</p> : null}
          <div
            className={`flex gap-4 ${align === "center" ? "justify-center" : "justify-start"}`}
          >
            {children ?? null}
          </div>
        </div>
      </div>
    </section>
  );
}
