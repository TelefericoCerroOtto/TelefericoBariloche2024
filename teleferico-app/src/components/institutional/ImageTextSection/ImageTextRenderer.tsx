import type { ImageTextBlock } from "@/types";
import { Default, DefaultFW, Panoramic } from "./ImageTextBlock";
import { Horizontal, Ladder, Miniatures } from "./ThreeImageTextBlock";
import { TwoImageTextBlock } from "./TwoImageTextBlock";

export interface Props {
  variant: ImageTextBlock["variant"];
  block: ImageTextBlock;
}

export default function ImageTextRenderer({
  variant = "default",
  block,
}: Props) {
  const { images } = block;
  const imagesCount = images.length;
  const sortedImages = images.sort((a, b) => a.order - b.order);
  block.images = sortedImages;

  if (imagesCount === 1) {
    switch (variant) {
      case "default":
        return <Default {...block} />;
      case "defaultFW":
        return <DefaultFW {...block} />;
      case "panoramic":
        return <Panoramic {...block} />;

      default:
        return <Default {...block} />;
    }
  } else if (imagesCount === 2) {
    switch (variant) {
      case "default":
        return <TwoImageTextBlock {...block} />;

      default:
        return <TwoImageTextBlock {...block} />;
    }
  } else if (imagesCount === 3) {
    switch (variant) {
      case "horizontal":
        return <Horizontal {...block} />;
      case "ladder":
        return <Ladder {...block} />;
      case "miniatures":
        return <Miniatures {...block} />;

      default:
        return <Horizontal {...block} />;
    }
  } else return <Default {...block} />;
}
