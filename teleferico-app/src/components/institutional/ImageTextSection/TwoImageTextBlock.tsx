import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
} from "@/components";
import type { ImageTextBlock } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "./CustomImage";

export function TwoImageTextBlock(props: ImageTextBlock) {
  const {
    images,
    title,
    description,
    isInverted = false,
    isHighlighted = false,
    link,
  } = props;

  return (
    <div
      className={`flex flex-col px-8 md:px-14 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} my-9 w-full max-w-[1536px] items-center justify-center`}
    >
      <div className="relative h-[300px] w-full overflow-x-scroll sm:h-[600px] lg:h-[700px] lg:w-1/2">
        <div className="absolute right-0 top-0 z-10 aspect-square w-3/5 min-w-[160px] max-w-[270px] sm:max-w-[500px] lg:max-w-full">
          <CustomImage image={images[0]} />
        </div>
        <div className="absolute bottom-0 z-0 aspect-square w-3/5 min-w-[160px] max-w-[270px] sm:max-w-[500px] lg:max-w-full">
          <CustomImage image={images[1]} />
        </div>
      </div>
      <div
        className={`flex w-full flex-col items-center px-0 md:items-start lg:w-1/2 lg:px-12 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-12"}`}
      >
        <div className="flex flex-col items-start gap-4 py-20">
          <h4 className="mb-4 text-center text-3xl font-bold capitalize text-inherit md:text-start md:text-4xl">
            {isHighlighted ? HighlightLastWord(title) : title}
          </h4>
          <div className="text-center md:text-start">
            <BlockRendererClient content={description as BlocksContent} />
          </div>
          {link ? <CustomLink href={link.href}>{link.label}</CustomLink> : null}
        </div>
      </div>
    </div>
  );
}
