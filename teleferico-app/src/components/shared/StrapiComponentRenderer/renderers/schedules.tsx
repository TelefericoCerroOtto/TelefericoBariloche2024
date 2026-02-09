import { Schedules } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderSchedules: RendererMap["page-components.schedules"] = (
  _block,
  ctx,
) => {
  return <Schedules locale={ctx.locale} />;
};
