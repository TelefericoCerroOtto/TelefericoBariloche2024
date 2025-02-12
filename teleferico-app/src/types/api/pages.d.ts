import { DynamicZone, StrapiLocales, Meta, RendereableBlocks } from "./index";

type PagesBlocks = DynamicZone<RendereableBlocks>;

interface HomeContent {
  blocks: PagesBlocks;
  createdAt: string;
  documentId: string;
  id: number;
  locale: StrapiLocales;
  publishedAt: string;
  route: string;
  updatedAt: string;
}

export interface GetHomePage {
  data: HomeContent[];
  meta: Meta;
}
