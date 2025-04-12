import { BlockRendererClient, TitleDescBlock } from "@/components";
import { getNew } from "@/lib/services";
import type { Locales } from "@/types";
import Image from "next/image";

export default async function NewDetailPage({
  params,
}: {
  params: Promise<{ locale: Locales; id: string }>;
}) {
  const { id: documentId, locale } = await params;
  const { ok, data } = await getNew({ locale, documentId });

  if (!ok)
    throw new Error(
      "Ocurrio un error y no se pudo recuperar la informacion de la noticia",
    );

  const { body, title, brief, cover } = data.data;

  return (
    <>
      <TitleDescBlock
        title={title}
        desc={brief}
        size="lg"
        align="center"
        className="mb-14 lg:px-8"
      />
      <div className="relative mb-14 h-[550px] w-full">
        <Image
          src={cover.image.url}
          alt={cover.alt}
          fill
          className="object-cover"
        />
      </div>
      <BlockRendererClient content={body} className="px-12 lg:px-32" />
    </>
  );
}
