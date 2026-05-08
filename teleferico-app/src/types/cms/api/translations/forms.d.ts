import type { ComponentTranslation, Meta } from "@/types";

export type GetFormsTranslationResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: {
        privacyNotice?: {
          beforeLink: string;
          linkLabel: string;
          afterLink: string;
        };
        fields: {
          firstName: {
            label: string;
            placeholder: string;
          };
          lastName: {
            label: string;
            placeholder: string;
          };
          gender: {
            label: string;
            placeholder: string;
            items: {
              male: string;
              female: string;
              other: string;
            };
          };
          sector: {
            label: string;
            placeholder: string;
            items: {
              tech: string;
              marketing: string;
              finances: string;
              engineer: string;
              tourism: string;
            };
          };
          email: {
            label: string;
            placeholder: string;
          };
          name: {
            label: string;
            placeholder: string;
          };
          age: {
            label: string;
            placeholder: string;
          };
          consultation: {
            label: string;
            placeholder: string;
          };
          campNo: {
            label: string;
            placeholder: string;
          };
          cv: {
            label: string;
            placeholder: string;
          };
          note: {
            label: string;
            placeholder: string;
          };
        };
        buttons: {
          send: string;
        };
      };
      rtValue: null;
      key: "forms";
    }>,
  ];
  meta: Meta;
};
