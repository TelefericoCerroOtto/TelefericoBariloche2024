import {
  FaqSection,
  FormError,
  Hero,
  HoursOverview,
  ImageTextRenderer,
  TitleDescBlock,
} from "@/components";
import type { Locales, RendereableBlocks } from "@/types";
import { deepMerge } from "@/utils";
import { Spacer, SpacerProps } from "@heroui/react";

export type StrapiComponentRendererConfig = Partial<{
  "faq-section": object;
  hero: object;
  "hours-overview": object;
  "image-text-block": {
    baseUrl: string;
  };
  spacer: object;
  "title-desc-block": object;
}>;

const defaultConfig: Required<StrapiComponentRendererConfig> = {
  "faq-section": {},
  hero: {},
  "hours-overview": {},
  "image-text-block": {
    baseUrl: "",
  },
  spacer: {},
  "title-desc-block": {},
};

interface Props {
  block: RendereableBlocks;
  locale: Locales;
  customConfig?: StrapiComponentRendererConfig;
}

export default function StrapiComponentRenderer(props: Props) {
  const { block, locale, customConfig } = props;

  const config = deepMerge(defaultConfig, customConfig);

  if (!block) {
    console.error("StrapiComponentRenderer block", block);
    return <FormError message="No content was found" />;
  }

  switch (block.__component) {
    case "page-components.hero": {
      // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      const { __component: _, id: __, cover, logo, ...props } = block;
      return (
        <Hero
          content={{
            cover: { src: cover?.image.url, alt: cover?.alt },
            ...(logo && { logo: { src: logo?.image.url, alt: logo?.alt } }),
            ...props,
          }}
        />
      );
    }

    case "page-components.hours-overview": {
      return (
        <HoursOverview withTextBlock={block.withTextBlock} locale={locale} />
      );
    }

    case "page-components.title-desc-block": {
      // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      const { __component: _, ...props } = block;
      return <TitleDescBlock {...props} />;
    }

    case "page-components.image-text-block": {
      const { baseUrl } = config["image-text-block"];

      if (!!block.link) {
        block.link.href = baseUrl + block.link.href;
      }

      return <ImageTextRenderer block={block} />;
    }

    case "page-components.faq-section": {
      const { favs } = block;
      return <FaqSection favs={favs} locale={locale} />;
    }

    case "page-components.spacer": {
      const { xSpace, ySpace } = block;
      return (
        <Spacer x={xSpace as SpacerProps["x"]} y={ySpace as SpacerProps["y"]} />
      );
    }

    default:
      return <FormError message="The retrieved component is not rendereable" />;
  }
}
