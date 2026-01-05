import {
  FaqSection,
  FormError,
  Hero,
  HoursOverview,
  ImageTextRenderer,
  Schedules,
  ServiceStatusButton,
  TitleDescBlock,
} from "@/components";
import type { Locales, RendereableBlocks } from "@/types";
import { Spacer, SpacerProps } from "@heroui/react";

interface Props {
  block: RendereableBlocks;
  locale: Locales;
}

export default function StrapiComponentRenderer(props: Props) {
  const { block, locale } = props;

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
      const { __component: _, ...props } = block;
      return <TitleDescBlock {...props} />;
    }

    case "page-components.image-text-block": {
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

    case "page-components.schedules": {
      return <Schedules locale={locale} />;
    }

    case "page-components.service-status-button": {
      return <ServiceStatusButton locale={locale} />;
    }

    default:
      return <FormError message="The retrieved component is not rendereable" />;
  }
}
