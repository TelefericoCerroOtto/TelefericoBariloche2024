import { Hero } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderHero: RendererMap["page-components.hero"] = (block) => {
  const { cover, logo, ...rest } = block;

  return (
    <Hero
      content={{
        cover: { src: cover?.image.url, alt: cover?.alt },
        ...(logo ? { logo: { src: logo?.image.url, alt: logo?.alt } } : {}),
        ...rest,
      }}
    />
  );
};
