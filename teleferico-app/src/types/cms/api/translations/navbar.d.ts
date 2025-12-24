import type { ComponentTranslation, Meta } from "@/types";

export type GetNavbarItemsResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: { items: { label: string; href: string }[] };
      rtValue: null;
      key: "navbar";
    }>,
  ];
  meta: Meta;
};
