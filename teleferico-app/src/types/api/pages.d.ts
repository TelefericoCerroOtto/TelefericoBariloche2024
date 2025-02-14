import { DynamicZone, StrapiLocales, Meta, RendereableBlocks } from "./index";

type PagesBlocks = DynamicZone<RendereableBlocks>;

interface PageContent {
  blocks: PagesBlocks;
  createdAt: string;
  documentId: string;
  id: number;
  locale: StrapiLocales;
  publishedAt: string;
  route: string;
  updatedAt: string;
}

export interface GetPageResponse {
  data: PageContent[];
  meta: Meta;
}
