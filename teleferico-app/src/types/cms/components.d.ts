import { type BlocksContent } from "@strapi/blocks-react-renderer";
import type { ServiceStateValues, StrapiImage, Zone } from "@/types";

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
export interface ServiceStateModal {
  __component: "page-components.service-state-modal";
  id: number;
  help: string;
  description: BlocksContent;
  stateList: StateTitle[];
}

export type HeroAlign = "bottom" | "center";

export type Hero = {
  __component: "page-components.hero";
  id: number;
  title?: string;
  description?: string;
  firstLink?: Link;
  secondLink?: Link;
  cover: { id: number } & Image;
  logo?: { id: number } & Image;
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
  | "default"
  | "defaultFW"
  | "panoramic"
  | "panoramicFW"
  | "spotlight";

export type TwoImagesVariant = "default";

export type ThreeImagesVariant = "horizontal" | "ladder" | "miniatures";

export type ImageTextVariants =
  | OneImageVariant
  | TwoImagesVariant
  | ThreeImagesVariant;

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
  variant: ImageTextVariants;
  images: Array<Image>;
  link?: Link;
  isInverted?: boolean;
  isHighlighted?: boolean;
};

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
  zones: Zone[];
}

export type RendereableBlocks =
  | ServiceStateModal
  | Hero
  | HoursOverview
  | ImageTextBlock
  | TitleDescBlock
  | FaqSection
  | Spacer
  | Schedules;
