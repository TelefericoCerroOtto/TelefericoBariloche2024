import { EditorialAlert } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderEditorialAlert: RendererMap["page-components.editorial-alert"] =
  (block) => {
    const { __component: _ignored, ...props } = block;
    return <EditorialAlert {...props} />;
  };
