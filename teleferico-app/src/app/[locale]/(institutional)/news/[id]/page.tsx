import { BlockRendererClient, TitleDescBlock } from "@/components";
import { getNew } from "@/lib/services";
import type { Locales } from "@/types";
import { Spacer } from "@heroui/react";
import { BlocksContent } from "@strapi/blocks-react-renderer";
import { notFound } from "next/navigation";
import NewsDetailImage from "./NewsDetailImage";

export default async function NewDetailPage({
  params,
}: {
  params: Promise<{ locale: Locales; id: string }>;
}) {
  const { id: documentId, locale } = await params;
  const { ok, data } = await getNew({ locale, documentId });

  if (!ok) notFound();

  const { body, title, brief } = data.data;

  return (
    <>
      <TitleDescBlock
        title={title}
        desc={brief as BlocksContent}
        size="lg"
        align="center"
      />
      <div className="relative mb-14 h-[550px] w-full">
        <NewsDetailImage
          cover={data.data.cover}
          detailImageDesktop={data.data.detailImageDesktop}
          detailImageMobile={data.data.detailImageMobile}
        />
      </div>
      <BlockRendererClient
        content={body as BlocksContent}
        prosePreset="feature"
        className="px-6 sm:px-12 lg:px-32 max-sm:prose-xl"
      />
      <Spacer y={28} />
    </>
  );
}
