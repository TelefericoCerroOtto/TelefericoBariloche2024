// teleferico-app/src/components/shared/strapi-renderers/index.ts

import type { RendereableBlocks } from "@/types";
import type { ReactNode } from "react";

import {
  renderCarrousel,
  renderEditorialAlert,
  renderFaqSection,
  renderHero,
  renderHoursOverview,
  renderImageTextBlock,
  renderPoliciesCallout,
  renderSchedules,
  renderServiceStatusButton,
  renderSpacer,
  renderTitleDescBlock,
} from "./renderers";
import type { RendererCtx, RendererMap } from "./shared/types";
import { renderActivityShowcase } from "./renderers/activity-showcase";

/**
 * Registry exhaustivo y tipado:
 * - Si agregás un nuevo bloque a `RendereableBlocks`, TypeScript te exige un renderer acá.
 * - Cada renderer recibe el tipo exacto del bloque según su key.
 */
export const strapiRenderers = {
  "page-components.hero": renderHero,
  "page-components.hours-overview": renderHoursOverview,
  "page-components.policies-callout": renderPoliciesCallout,
  "page-components.title-desc-block": renderTitleDescBlock,
  "page-components.editorial-alert": renderEditorialAlert,
  "page-components.image-text-block": renderImageTextBlock,
  "page-components.faq-section": renderFaqSection,
  "page-components.spacer": renderSpacer,
  "page-components.schedules": renderSchedules,
  "page-components.service-status-button": renderServiceStatusButton,
  "page-components.carrousel": renderCarrousel,
  "page-components.activity-showcase": renderActivityShowcase,
} satisfies RendererMap;

/**
 * Dispatcher sin switch.
 * Nota: TypeScript no puede “unir” automáticamente el renderer con el bloque en un index access
 * (por ser una union). Este cast está encapsulado acá y el resto del sistema queda 100% tipado.
 */
export function renderStrapiBlock(
  block: RendereableBlocks,
  ctx: RendererCtx,
): ReactNode {
  const renderer = strapiRenderers[block.__component] as (
    // eslint-disable-next-line no-unused-vars
    b: typeof block,
    // eslint-disable-next-line no-unused-vars
    c: RendererCtx,
  ) => ReactNode;

  return renderer(block, ctx);
}
