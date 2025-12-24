import type { ComponentTranslation, Meta } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export type GetPoliciesResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: null;
      rtValue: BlocksContent;
      key: "policies";
    }>,
  ];
  meta: Meta;
};
