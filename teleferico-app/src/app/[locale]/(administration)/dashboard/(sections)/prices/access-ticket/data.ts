import type { InputLocaleConfig } from "@/types";

export const nameConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Nombre de la tarifa (Español)",
    name: "accessName_es-AR",
    placeholder: "Ej.: Ticket mayor",
  },
  en: {
    label: "Nombre de la tarifa (Inglés)",
    name: "accessName_en",
    placeholder: "Ej.: Adult ticket",
  },
  pt: {
    label: "Nombre de la tarifa (Portugués)",
    name: "accessName_pt",
    placeholder: "Ej.: Bilhete sênior",
  },
};

export const descriptionConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Descripción de la tarifa (Español)",
    name: "accessDescription_es-AR",
    placeholder: "Ej.: Ticket para mayores de 65 años",
  },
  en: {
    label: "Descripción de la tarifa (Inglés)",
    name: "accessDescription_en",
    placeholder: "Ej.: Ticket for people over 65 years old",
  },
  pt: {
    label: "Descripción de la tarifa (Portugués)",
    name: "accessDescription_pt",
    placeholder: "Ej.: Bilhete para pessoas com mais de 65 anos",
  },
};
