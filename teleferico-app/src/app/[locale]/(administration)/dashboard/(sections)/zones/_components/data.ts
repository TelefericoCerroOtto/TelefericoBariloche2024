import type { InputLocaleConfig } from "@/types";

export const nameConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Nombre de la zona (Español)",
    placeholder: "Ej.: Confiteria Giratoria",
    name: "zoneName_es-AR",
  },
  en: {
    label: "Nombre de la zona (Inglés)",
    placeholder: "Ej.: Revolving restaurant",
    name: "zoneName_en",
  },
  pt: {
    label: "Nombre de la zona (Portugués)",
    placeholder: "Ej.: Restarunte Giratório",
    name: "zoneName_pt",
  },
};

export const descConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Descripción opcional (Español)",
    placeholder:
      "Ej.: Un restaurante giratorio con vista 360 grados que gira en 20 minutos.... ",
    name: "zoneDescription_es-AR",
  },
  en: {
    label: "Descripción opcional (Portugués)",
    placeholder:
      "A revolving restaurant with a 360-degree view that rotates in 20 minutes...",
    name: "zoneDescription_en",
  },
  pt: {
    label: "Descripción opcional (Inglés)",
    placeholder:
      "Um restaurante giratório com vista de 360 graus que completa uma volta em 20 minutos....",
    name: "zoneDescription_pt",
  },
};
