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

export interface Hero {
  __component: "page-components.hero";
  id: number;
  title?: string;
  description?: string;
  firstLink?: Link;
  secondLink?: Link;
  cover: { id: number } & Image;
  logo?: { id: number } & Image;
  align: "bottom" | "center";
}

export interface HoursOverview {
  __component: "page-components.hours-overview";
  id: number;
  withTextBlock: boolean;
}

export interface TitleDescBlock {
  __component: "page-components.title-desc-block";
  title: string;
  id: number;
  align: "center" | "start";
  size: "sm" | "md" | "lg" | "full";
  titleCase: "normal" | "capitalize" | "uppercase" | "lowercase";
  bgColor: "none" | "gray";
  epigraph?: string;
  desc?: BlocksContent;
  className: string;
}

export interface ImageTextBlock {
  __component: "page-components.image-text-block";
  id: number;
  title: string;
  titleCase: "normal" | "capitalize" | "uppercase" | "lowercase";
  bgColor: "none" | "gray";
  description: BlocksContent;
  epigraph: string | null;
  variant:
    | "default"
    | "defaultFW"
    | "panoramic"
    | "panoramicFW"
    | "horizontal"
    | "ladder"
    | "miniatures";
  images: Array<Image>;
  link?: Link;
  isInverted?: boolean;
  isHighlighted?: boolean;
}

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
