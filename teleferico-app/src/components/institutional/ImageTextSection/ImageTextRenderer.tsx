import { FormError } from "@/components";
import type { ImageTextBlock } from "@/types";
import { normalizeImageTextBlock } from "./normalize";
import { getImageTextComponentByKey } from "./registry";

export interface Props {
  block: ImageTextBlock;
}

export default function ImageTextRenderer({ block }: Props) {
  const res = normalizeImageTextBlock(block);

  if (!res.ok) {
    console.error("[ImageTextRenderer]", res.message, res.details);
    return <FormError message={res.message} />;
  }

  const Component = getImageTextComponentByKey(res.key);
  return <Component {...res.props} />;
}
