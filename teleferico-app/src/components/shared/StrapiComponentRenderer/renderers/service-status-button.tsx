import { ServiceStatusButton } from "@/components";
import type { RendererMap } from "../shared/types";

export const renderServiceStatusButton: RendererMap["page-components.service-status-button"] =
  (_block, ctx) => {
    return <ServiceStatusButton locale={ctx.locale} />;
  };
