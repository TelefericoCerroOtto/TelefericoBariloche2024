import type { ComponentTranslation, Meta } from "@/types";

export type GetSchedulesTranslationResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: {
        header: { epigraph: string; title: string; legend: string };
        components: {
          Loading: { title: string; legend: string };
          Error: { title: string; legend: string; button: string };
          Empty: { title: string; legend: string };
          TimeRow: {
            opens: string;
            closes: string;
          };
        };
        badge: {
          open: string;
          closed: string;
        };
      };
      rtValue: null;
      key: "schedules";
    }>,
  ];
  meta: Meta;
};
