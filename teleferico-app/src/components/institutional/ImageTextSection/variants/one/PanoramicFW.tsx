import { CustomLink, TitleDescBlock } from "@/components";
import { bgStyles } from "@/lib/constants/styles.const";
import type { ImageTextBlock } from "@/types";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";

export default function PanoramicFW(props: ImageTextBlock) {
  const {
    images,
    title,
    titleCase = "normal",
    description,
    link,
    isInverted,
    epigraph,
    bgColor,
  } = props;

  return (
    <section
      className={`mb-14 flex w-full gap-12 ${isInverted ? "flex-col-reverse" : "flex-col"} ${bgStyles[bgColor]}`}
    >
      <div className="my-10 flex w-full flex-col items-stretch gap-10 px-6 md:px-12 lg:flex-row lg:px-32">
        <div className="w-full rounded-3xl bg-background/85 px-8 py-12 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/15 backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
              <LogoBadge />
              <div className="flex-1">
                <TitleDescBlock
                  title={title}
                  titleCase={titleCase}
                  desc={description}
                  epigraph={epigraph}
                  align="start"
                />
              </div>
            </div>
            {link ? (
              <div className="flex justify-start pt-2">
                <CustomLink href={link?.href} withButtonStyles>
                  {link.label}
                </CustomLink>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="group relative h-[550px] w-full overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
        <CustomImage image={images[0]} />
      </div>
    </section>
  );
}
