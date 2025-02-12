import { type BlocksContent } from "@strapi/blocks-react-renderer";
import type { ServiceStateValues, StrapiImage } from "./index";

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
  title: string;
  description: string;
  firstLink: Link;
  secondLink: Link;
  cover: { id: number } & Image;
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
  align?: "center" | "start";
  size?: "sm" | "md" | "lg";
  caseStyle?: "capitalize" | "uppercase" | "lowercase" | "normal";
  epigraph?: string;
  desc?: BlocksContent;
}

export interface ImageTextBlock {
  __component: "page-components.image-text-block";
  id: number;
  title: string;
  description: unknown;
  variant:
    | "default"
    | "defaultFW"
    | "panoramic"
    | "horizontal"
    | "ladder"
    | "miniatures";
  images: Array<Image>;
  link?: Link;
  isInverted?: boolean;
  isHighlighted?: boolean;
}

export type RendereableBlocks =
  | ServiceStateModal
  | Hero
  | HoursOverview
  | ImageTextBlock
  | TitleDescBlock;
