import type { Meta, Station } from "@/types";

export type GetStationsResponse = {
  data: Station[];
  meta: Meta;
};
