import type { ComponentTranslation, Meta, ServiceStateValues } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export type GetServiceButtonResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: {
        error: BlocksContent;
        button: {
          trigger: string;
          close: string;
        };
        modal: {
          items: {
            order: number;
            state: ServiceStateValues;
            stateLegend: string;
            title: string;
            stateDesc: string;
          }[];
          disclaimer: BlocksContent;
        };
      };
      rtValue: null;
      key: "servicebutton";
    }>,
  ];
  meta: Meta;
};
