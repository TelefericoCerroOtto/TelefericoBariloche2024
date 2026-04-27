import type { ServiceStateValues, StrapiImage } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

// UTILS
export interface Link {
  label: string;
  href: string;
}

export interface ServiceStates {
  name: ServiceStateValues;
}

export interface StateTitle {
  title: string;
  state: ServiceStates;
}

export interface Image {
  id: number;
  image: StrapiImage;
  alt: string;
}

// PAGE
export type ServiceStatusButton = {
  __component: "page-components.service-status-button";
  id: number;
};

export type HeroAlign = "bottom" | "center";

export type Hero = {
  __component: "page-components.hero";
  id: number;
  title?: string;
  description?: string;
  firstLink?: Link;
  secondLink?: Link;
  desktopCover: Image;
  mobileCover: Image;
  logo?: Image;
  align: HeroAlign;
};

export interface HoursOverview {
  __component: "page-components.hours-overview";
  id: number;
  withTextBlock: boolean;
}

export type TitleDescCase = "normal" | "capitalize" | "uppercase" | "lowercase";

export type TitleCaseAlgin = "center" | "start";

export type TitleCaseSize = "sm" | "md" | "lg" | "full";

export type TitleCaseColor = "none" | "gray";

export type TitleDescBlock = {
  __component: "page-components.title-desc-block";
  title: string;
  id: number;
  align: TitleCaseAlgin;
  size: TitleCaseSize;
  titleCase: TitleDescCase;
  bgColor: TitleCaseColor;
  epigraph?: string;
  desc?: BlocksContent;
  className: string;
};

export type OneImageVariant =
  | "single"
  | "poster"
  | "card"
  | "panoramic"
  | "spotlight";

export type TwoImagesVariant = "double" | "cascade";

export type ThreeImagesVariant =
  | "horizontal"
  | "masonry"
  | "ladder"
  | "miniatures";

export type ImageVariants =
  | OneImageVariant
  | TwoImagesVariant
  | ThreeImagesVariant;

export type OneImageBlock = {
  oneImageBlock: {
    variant: OneImageVariant;
    desktopImages: [Image];
    mobileImages: [Image];
  };
};

export type TwoImagesBlock = {
  twoImagesBlock: {
    variant: TwoImagesVariant;
    desktopImages: [Image, Image];
    mobileImages: [Image, Image];
  };
};

export type ThreeImagesBlock = {
  threeImagesBlock: {
    variant: ThreeImagesVariant;
    desktopImages: [Image, Image, Image];
    mobileImages: [Image, Image, Image];
  };
};

export type Variants =
  | ({ imagesAmount: "one" } & OneImageBlock)
  | ({ imagesAmount: "two" } & TwoImagesBlock)
  | ({ imagesAmount: "three" } & ThreeImagesBlock);

export type ImageTextCase = "normal" | "capitalize" | "uppercase" | "lowercase";

export type ImageTextColor = "none" | "gray";

export type ImageTextBlock = {
  __component: "page-components.image-text-block";
  id: number;
  title: string;
  titleCase: ImageTextCase;
  bgColor: ImageTextColor;
  description: BlocksContent;
  epigraph: string | null;
  link?: Link | null;
  isInverted?: boolean;
  isHighlighted?: boolean;
} & Variants;

export interface FaqSection {
  __component: "page-components.faq-section";
  id: number;
  favs: boolean;
}

export interface Spacer {
  __component: "page-components.spacer";
  id: number;
  xSpace: number;
  ySpace: number;
}

export interface Schedules {
  __component: "page-components.schedules";
  id: number;
}

export type CarrouselItem = {
  id: number;
  title?: string | null;
  epigraph?: string | null;
  description?: BlocksContent | null;
  link?: Link | null;
  desktopCover: Image;
  mobileCover: Image;
};

export type Carrousel = {
  __component: "page-components.carrousel";
  id: number;
  autoplayMs?: number | null;
  pauseOnHover: boolean;
  items: CarrouselItem[];
};

export type ActivityShowcase = {
  __component: "page-components.activity-showcase";
  id: number;
  activity: {
    id: number;
    documentId: string;
  };
};

export type RendereableBlocks =
  | ServiceStatusButton
  | Hero
  | HoursOverview
  | ImageTextBlock
  | TitleDescBlock
  | FaqSection
  | Spacer
  | Schedules
  | Carrousel
  | ActivityShowcase;
