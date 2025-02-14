import {
  FormError,
  Hero,
  HoursOverview,
  ImageTextRenderer,
  ServiceButton,
  TitleDescBlock,
} from "@/components";
import type { Locales, RendereableBlocks } from "@/types";

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
    // TODO: remove ServiceStateModal from strapi components and its types(deprecated)
    case "page-components.service-state-modal": {
      return null;
      return <ServiceButton />;
    }

    case "page-components.hero": {
      return <Hero content={block} />;
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
      return <ImageTextRenderer block={block} />;
    }

    default:
      break;
  }
}
