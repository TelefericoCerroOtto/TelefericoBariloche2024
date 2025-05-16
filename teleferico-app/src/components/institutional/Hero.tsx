import { CustomLink } from "@/components";
import notFoundImg from "@/public/image-not-found.jpg";
import { Link } from "@/types";
import Image from "next/image";

interface Props {
  content: {
    cover: { src: string; alt: string };
    title?: string;
    description?: string;
    align?: "bottom" | "center";
    firstLink?: Link;
    secondLink?: Link;
    logo?: { src: string; alt: string };
  };
}

export default function Hero(props: Props) {
  const { content } = props;
  const {
    cover,
    title,
    description,
    align = "bottom",
    firstLink,
    secondLink,
    logo,
  } = content;

  return (
    <div className="relative mb-14 min-h-[600px] w-full md:h-3/4 lg:h-1/2">
      <Image
        src={cover?.src ?? notFoundImg.src}
        alt={cover?.alt ?? "imagen de fondo gris"}
        fill
        className="z-0 object-cover"
      />
      <div className="absolute inset-0 bg-black bg-opacity-65" />
      <div
        className={`absolute z-10 flex h-full w-5/6 max-w-[1536px] gap-6 pb-16 text-white sm:w-3/4 ${align === "bottom" ? "justify-end" : "justify-center"} left-1/2 right-auto -translate-x-1/2 transform flex-col`}
      >
        {title ? (
          <h1 className="text-3xl font-bold capitalize text-inherit md:text-5xl">
            {title}
          </h1>
        ) : null}
        {description ? <p className="text-inherit">{description}</p> : null}
        <div
          className={`flex gap-4 ${align === "center" ? "justify-center" : "justify-start"}`}
        >
          {logo ? (
            <Image src={logo.src} width={550} height={125} alt={logo.alt} />
          ) : null}
          {firstLink ? (
            <CustomLink href={firstLink.href} intent="outlineWhite">
              {firstLink.label}
            </CustomLink>
          ) : null}
          {secondLink ? (
            <CustomLink href={secondLink.href} intent="ghostWhite">
              {secondLink.label}
            </CustomLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}
