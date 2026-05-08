import type { ComponentTranslation, Meta } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export type GetPrivacyResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: null;
      rtValue: BlocksContent;
      key: "privacy";
    }>,
  ];
  meta: Meta;
};
