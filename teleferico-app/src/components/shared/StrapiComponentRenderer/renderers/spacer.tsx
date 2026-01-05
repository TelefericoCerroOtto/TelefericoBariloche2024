import { Spacer, type SpacerProps } from "@heroui/react";
import type { RendererMap } from "../shared/types";

export const renderSpacer: RendererMap["page-components.spacer"] = (block) => {
  return (
    <Spacer
      x={block.xSpace as SpacerProps["x"]}
      y={block.ySpace as SpacerProps["y"]}
    />
  );
};
