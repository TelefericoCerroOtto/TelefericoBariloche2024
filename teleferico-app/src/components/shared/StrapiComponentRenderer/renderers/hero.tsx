import { Hero } from "@/components";
import { toCmsImageProxyUrl } from "@/lib/adapters";
import type { RendererMap } from "../shared/types";

export const renderHero: RendererMap["page-components.hero"] = (block) => {
  const { desktopCover, mobileCover, logo, ...rest } = block;

  return (
    <Hero
      content={{
        desktopCover: {
          src: toCmsImageProxyUrl(desktopCover?.image?.url),
          alt: desktopCover?.alt,
        },
        mobileCover: {
          src: toCmsImageProxyUrl(mobileCover?.image?.url),
          alt: mobileCover?.alt,
        },
        ...(logo
          ? { logo: { src: toCmsImageProxyUrl(logo?.image?.url), alt: logo?.alt } }
          : {}),
        ...rest,
      }}
    />
  );
};
