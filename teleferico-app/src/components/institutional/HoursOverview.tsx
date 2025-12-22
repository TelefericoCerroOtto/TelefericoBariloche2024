import { BlockRendererClient, TitleDescBlock } from "@/components";
import { getComponentTranslation } from "@/lib/services";
import bus from "@/public/busInfo.png";
import cerro from "@/public/cerroInfo.png";
import gondola from "@/public/gondolaInfo.png";
import type { Locales } from "@/types";
import { Spacer } from "@heroui/react";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import Image from "next/image";

interface Props {
  locale: Locales;
  withTextBlock: boolean;
}

const items = [
  { tag: "cablecar", src: gondola.src },
  { tag: "mountain", src: cerro.src },
  { tag: "bus", src: bus.src },
];

function HoursOverviewItems({
  items,
}: {
  items: {
    id: number;
    tag: string;
    src: string;
    alt: string;
    title: string;
    desc: BlocksContent;
  }[];
}) {
  return (
    <div className="mb-12 flex max-w-[1376px] flex-col items-center gap-10 px-8 md:px-14 lg:flex-row">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex max-w-[450px] flex-col items-center gap-3 text-center"
        >
          <Image src={item.src} alt={item.alt} width={80} height={80} />
          <h4 className="text-2xl font-bold">{item.title}</h4>
          <BlockRendererClient content={item.desc} />
        </div>
      ))}
    </div>
  );
}

export default async function HoursOverview(props: Props) {
  const { locale, withTextBlock } = props;
  const { ok, data } = await getComponentTranslation(locale, "hoursoverview");

  if (!ok) {
    // TODO: Mejorar respuesta de la interfaz en caso de que no se pueda recuperar la informacion
    throw new Error("No se pudo recuperar la informacion del footer");
  }

  const content = data.data[0].jsonValue;
  const itemsIntl = content.items.map((item) => {
    const { src } = items.find((itm) => item.tag === itm.tag)!;
    const { desc, ...props } = item;
    const assertion = { desc } as { desc: BlocksContent };
    return { ...assertion, ...props, src };
  });

  if (withTextBlock)
    return (
      <section className="mb-14 text-lg">
        <TitleDescBlock
          title={content.title}
          desc={content.desc as BlocksContent}
        />
        <Spacer y={16} />
        <HoursOverviewItems items={itemsIntl} />
      </section>
    );
  else return <HoursOverviewItems items={itemsIntl} />;
}
