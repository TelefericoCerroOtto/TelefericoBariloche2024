import { CustomLink, TitleDescBlock } from "@/components";
import { getTranslationValue } from "@/lib/actions";
import muniecodenieve from "@/public/muniecodenieve.jpg";
import { Locales } from "@/types";
import { ROUTES } from "@/utils/routes.const";
import Image from "next/image";

interface Props {
  locale: Locales;
}
export default async function PosterSection(props: Props) {
  const { locale } = props;
  const { ACTIVITIES } = ROUTES;
  const { title, desc, epigraph, link, imagealt } = await getTranslationValue(
    locale,
    "pages.home.postersection",
  );

  return (
    <section className="mb-14 flex w-full flex-col">
      <div className="my-14 flex w-full flex-col items-stretch px-10 lg:flex-row lg:px-32">
        <TitleDescBlock
          title={title}
          desc={desc}
          epigraph={epigraph}
          align="start"
        />
        <div className="flex h-full w-full items-end justify-start lg:justify-end">
          <CustomLink href={ACTIVITIES}>{link.label}</CustomLink>
        </div>
      </div>
      <div className="relative h-[550px] w-full">
        <Image
          src={muniecodenieve.src}
          alt={imagealt}
          fill
          className="object-cover"
        />
      </div>
    </section>
  );
}
