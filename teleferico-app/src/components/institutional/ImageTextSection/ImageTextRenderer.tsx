import type { ImageTextBlock } from "@/types";
import { Default, DefaultFW, Panoramic, PanoramicFW } from "./ImageTextBlock";
import { Horizontal, Ladder, Miniatures } from "./ThreeImageTextBlock";
import { TwoImageTextBlock } from "./TwoImageTextBlock";

export interface Props {
  block: ImageTextBlock;
}

export default function ImageTextRenderer({ block }: Props) {
  const { images, variant } = block;
  const imagesCount = images.length;

  if (imagesCount === 1) {
    switch (variant) {
      case "default":
        return <Default {...block} />;
      case "defaultFW":
        return <DefaultFW {...block} />;
      case "panoramic":
        return <Panoramic {...block} />;
      case "panoramicFW":
        return <PanoramicFW {...block} />;

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
