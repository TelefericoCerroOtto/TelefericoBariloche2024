import { TitleDescBlock } from "@/components";
import Image from "next/image";
import { news } from "../data";

export default async function NewsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const data = news.filter((item) => item.id === slug)[0];

  return (
    <>
      <TitleDescBlock
        title={data.title}
        desc={data.legend}
        size="lg"
        align="center"
      />
      <div className="relative mb-14 h-[550px] w-full">
        <Image
          src={data.images.cover.src}
          alt={data.images.cover.alt}
          fill
          className="object-cover"
        />
      </div>
      {/* TODO: Implement rich text */}
      <p>{data.body}</p>
    </>
  );
}
