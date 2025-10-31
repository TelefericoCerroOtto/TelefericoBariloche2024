import { BlockRendererClient } from "@/components";
import { Locales } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import Image from "next/image";
import Link from "next/link";

interface Props {
  documentId: string;
  imgSrc: string;
  imgAlt: string;
  title: string;
  brief: BlocksContent;
  locale: Locales;
}

export default function Card(props: Props) {
  const { title, brief, documentId, imgAlt, imgSrc, locale } = props;

  return (
    <Link
      href={`/${locale}/news/${documentId}`}
      className="group flex w-full max-w-[300px] flex-col gap-3 hover:cursor-pointer"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={imgSrc}
          alt={imgAlt}
          fill
          className="transform object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      <p className="text-lg font-semibold text-inherit transition-colors duration-200 group-hover:text-custom-red group-hover:underline">
        {title}
      </p>
      <BlockRendererClient content={brief} />
    </Link>
  );
}
