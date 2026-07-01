import { ImageTextRenderer } from "@/components";
import type { RendererMap } from "../shared/types";
import { createElement } from "react";

export const renderImageTextBlock: RendererMap["page-components.image-text-block"] =
  (block) => {
    if (block.isVisible === false) return null;

    return createElement(ImageTextRenderer, { block });
  };
