import type { RendereableBlocks } from "@/types";

type ComponentKey = RendereableBlocks["__component"];
type BlockOf<K extends ComponentKey> = Extract<
  RendereableBlocks,
  { __component: K }
>;

export type RendererMap = {
  // eslint-disable-next-line no-unused-vars
  [K in ComponentKey]: (block: BlockOf<K>, ctx: RendererCtx) => ReactNode;
};
