import type { ComponentTranslation, Meta } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export type GetFooterResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: {
        socialitems: {
          ig: string;
          fb: string;
          tt: string;
        };
        menuitems: {
          jobs: string;
          contact: string;
          policies: string;
          faqs: string;
        };
        contact: {
          title: string;
          direction: string;
        };
      };
      rtValue: BlocksContent;
      key: "footer";
    }>,
  ];
  meta: Meta;
};
