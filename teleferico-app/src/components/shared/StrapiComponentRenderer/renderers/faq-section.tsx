import { FaqSection } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderFaqSection: RendererMap["page-components.faq-section"] = (
  block,
  ctx,
) => {
  return <FaqSection favs={block.favs} locale={ctx.locale} />;
};
