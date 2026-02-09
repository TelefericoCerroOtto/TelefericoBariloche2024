import { TitleDescBlock } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderTitleDescBlock: RendererMap["page-components.title-desc-block"] =
  (block) => {
    const { __component: _ignored, ...props } = block;
    return <TitleDescBlock {...props} />;
  };
