import { FormError } from "@/components";
import type { Locales, RendereableBlocks } from "@/types";
import { renderStrapiBlock } from "./registry";

interface Props {
  block: RendereableBlocks;
  locale: Locales;
}

export default function StrapiComponentRenderer({ block, locale }: Props) {
  if (!block) {
    console.error("StrapiComponentRenderer: missing block", block);
    return <FormError message="No content was found" />;
  }

  return renderStrapiBlock(block, { locale });
}
