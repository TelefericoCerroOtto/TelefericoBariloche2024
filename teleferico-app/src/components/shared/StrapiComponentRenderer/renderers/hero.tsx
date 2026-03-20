import { Hero } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderHero: RendererMap["page-components.hero"] = (block) => {
  const { desktopCover, mobileCover, logo, ...rest } = block;

  return (
    <Hero
      content={{
        desktopCover: { src: desktopCover?.image?.url, alt: desktopCover?.alt },
        mobileCover: { src: mobileCover?.image?.url, alt: mobileCover?.alt },
        ...(logo ? { logo: { src: logo?.image?.url, alt: logo?.alt } } : {}),
        ...rest,
      }}
    />
  );
};
