import type { BlocksContent } from "@strapi/blocks-react-renderer";
import type { Image } from "./components";
import type { StrapiLocales, StrapiRecord } from "./general";

export type NewsLocalization = StrapiRecord<{
  title: string;
  body: BlocksContent;
  brief: BlocksContent;
  highlighted: boolean;
  date: string;
  cover: Image;
  locale: StrapiLocales;
}>;

export type NewsEntity = StrapiRecord<{
  title: string;
  body: BlocksContent;
  brief: BlocksContent;
  highlighted: boolean;
  date: string;
  cover: Image;
  localizations?: NewsLocalization[];
}>;

export type NewsCreateDto = {
  data: {
    title: string;
    body: BlocksContent;
    brief: BlocksContent;
    highlighted: boolean;
    date: string;
    cover: {
      alt: string;
      image: {
        connect: Array<{ documentId: string }>;
      };
    };
  };
};

export type NewsUpdateDto = {
  data: Partial<NewsCreateDto["data"]>;
};
