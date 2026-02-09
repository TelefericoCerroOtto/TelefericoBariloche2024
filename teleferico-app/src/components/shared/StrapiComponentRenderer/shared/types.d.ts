import type { Locales, RendereableBlocks } from "@/types";
import { type ReactNode } from "react";

type ComponentKey = RendereableBlocks["__component"];
type BlockOf<K extends ComponentKey> = Extract<
  RendereableBlocks,
  { __component: K }
>;

export type RendererCtx = {
  locale: Locales;
};

export type RendererMap = {
  // eslint-disable-next-line no-unused-vars
  [K in ComponentKey]: (block: BlockOf<K>, ctx: RendererCtx) => ReactNode;
};
