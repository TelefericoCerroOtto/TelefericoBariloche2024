import type { InputLocaleConfig } from "@/types";

export const bodyConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Cuerpo de la noticia (Español)",
    placeholder: "Escribe el cuerpo de la noticia en Español...",
    name: "body_es-AR",
  },
  en: {
    label: "Cuerpo de la noticia (Inglés)",
    placeholder: "Escribe el cuerpo de la noticia en Inglés...",
    name: "body_en",
  },
  pt: {
    label: "Cuerpo de la noticia (Portugués)",
    placeholder: "Escribe el cuerpo de la noticia en Portugués...",
    name: "body_pt",
  },
};

export const briefConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Resumen (Español)",
    placeholder: "Resumen de la noticia en Español...",
    name: "brief_es-AR",
  },
  en: {
    label: "Resumen (Inglés)",
    placeholder: "Resumen de la noticia en Inglés...",
    name: "brief_en",
  },
  pt: {
    label: "Resumen (Portugués)",
    placeholder: "Resumen de la noticia en Portugués...",
    name: "brief_pt",
  },
};

export const titleConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Título (Español)",
    name: "title_es-AR",
    placeholder: "Ej.: Reabrimos al público",
  },
  en: {
    label: "Título (Inglés)",
    name: "title_en",
    placeholder: "Ej.: We reopen to the public",
  },
  pt: {
    label: "Título (Portugués)",
    name: "title_pt",
    placeholder: "Ej.: Reabrimos ao público",
  },
};
