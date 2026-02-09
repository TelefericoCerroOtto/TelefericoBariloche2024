import { HoursOverview } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderHoursOverview: RendererMap["page-components.hours-overview"] =
  (block, ctx) => {
    return (
      <HoursOverview withTextBlock={block.withTextBlock} locale={ctx.locale} />
    );
  };
