import { DynamicZone, Locales, Meta, ServiceStateModal } from "./index";

type HomeBlocks = DynamicZone<ServiceStateModal>;

interface HomeContent {
  blocks: HomeBlocks;
  createdAt: string;
  documentId: string;
  id: number;
  locale: Locales;
  publishedAt: string;
  route: string;
  updatedAt: string;
}

export interface GetHomePage {
  data: HomeContent[];
  meta: Meta;
}
