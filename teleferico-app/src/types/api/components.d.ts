import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { ServiceStateValues } from "./index";

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

export interface ServiceStateModal {
  __component: "page-components.service-state-modal";
  id: number;
  help: string;
  description: BlocksContent;
  stateList: StateTitle[];
}

export type RendereableBlocks = ServiceStateModal;
