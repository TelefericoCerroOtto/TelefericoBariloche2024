import { BlockRendererClient, TitleDescBlock } from "@/components";
import { getNew } from "@/lib/services";
import type { Locales } from "@/types";
import { BlocksContent } from "@strapi/blocks-react-renderer";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function NewDetailPage({
  params,
}: {
  params: Promise<{ locale: Locales; id: string }>;
}) {
  const { id: documentId, locale } = await params;
  const { ok, data } = await getNew({ locale, documentId });

  if (!ok) notFound();

  const { body, title, brief, cover } = data.data;

  return (
    <>
      <TitleDescBlock
        title={title}
        desc={brief as BlocksContent}
        size="lg"
        align="center"
      />
      <div className="relative mb-14 h-[550px] w-full">
        <Image
          src={cover.url}
          alt={cover.alternativeText || "News cover image"}
          fill
          className="object-cover"
        />
      </div>
      <BlockRendererClient
        content={body as BlocksContent}
        proseSize="xl"
        className="px-12 lg:px-32"
      />
    </>
  );
}
