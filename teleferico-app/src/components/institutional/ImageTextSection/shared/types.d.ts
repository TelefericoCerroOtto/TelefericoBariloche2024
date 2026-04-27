// teleferico-app/src/components/institutional/ImageTextSection/types.ts
import type {
  Image,
  ImageTextCase,
  ImageTextColor,
  Link,
  OneImageVariant,
  ThreeImagesVariant,
  TwoImagesVariant,
} from "@/types";
import type { BlocksContent } from "@strapi/blocks-react-renderer";

// Props comunes (contenido)
export type ImageTextContentProps = {
  title: string;
  titleCase: ImageTextCase;
  bgColor: ImageTextColor;
  description: BlocksContent;
  epigraph: string | null;
  link?: Link | null;
  isInverted?: boolean;
  isHighlighted?: boolean;
};

// Props por “bucket” (UI view model)
export type OneImageProps = ImageTextContentProps & {
  variant: OneImageVariant;
  desktopImages: [Image];
  mobileImages: [Image];
};

export type TwoImagesProps = ImageTextContentProps & {
  variant: TwoImagesVariant;
  desktopImages: [Image, Image];
  mobileImages: [Image, Image];
};

export type ThreeImagesProps = ImageTextContentProps & {
  variant: ThreeImagesVariant;
  desktopImages: [Image, Image, Image];
  mobileImages: [Image, Image, Image];
};

export type ImageTextVariantProps =
  | OneImageProps
  | TwoImagesProps
  | ThreeImagesProps;
