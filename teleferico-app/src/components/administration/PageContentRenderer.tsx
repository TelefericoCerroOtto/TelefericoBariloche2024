import { ServiceButton } from "@/components";
import type { RendereableBlocks } from "@/types";

interface Props {
  block: RendereableBlocks;
}

export default function PageContentRenderer(props: Props) {
  const { block } = props;

  switch (block.__component) {
    case "page-components.service-state-modal":
      return <ServiceButton content={block} />;

    default:
      break;
  }
}
