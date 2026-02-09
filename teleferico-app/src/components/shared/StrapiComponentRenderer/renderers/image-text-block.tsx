import { ImageTextRenderer } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderImageTextBlock: RendererMap["page-components.image-text-block"] =
  (block) => {
    return <ImageTextRenderer block={block} />;
  };
