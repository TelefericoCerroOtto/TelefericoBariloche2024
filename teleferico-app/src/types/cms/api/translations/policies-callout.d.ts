import type { ComponentTranslation, Meta } from "@/types";

export type PoliciesCalloutContent = {
  epigraph: string;
  title: string;
  description: string;
  ctaLabel: string;
};

export type GetPoliciesCalloutResponse = {
  data: ComponentTranslation<{
    jsonValue: PoliciesCalloutContent;
    rtValue: null;
    key: "policies-callout";
  }>[];
  meta: Meta;
};
