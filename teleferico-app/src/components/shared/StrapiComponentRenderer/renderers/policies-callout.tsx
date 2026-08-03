import { PoliciesCallout } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderPoliciesCallout: RendererMap["page-components.policies-callout"] =
  (block, ctx) => {
    return <PoliciesCallout id={block.id} locale={ctx.locale} />;
  };
