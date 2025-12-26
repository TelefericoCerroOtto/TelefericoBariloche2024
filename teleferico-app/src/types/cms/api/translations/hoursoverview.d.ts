import type { ComponentTranslation, Meta } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export type GetHoursoverviewResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: {
        title: string;
        desc: BlocksContent;
        items: Array<{
          id: number;
          tag: string;
          title: string;
          desc: BlocksContent;
          alt: string;
        }>;
      };
      rtValue: null;
      key: "hoursoverview";
    }>,
  ];
  meta: Meta;
};
