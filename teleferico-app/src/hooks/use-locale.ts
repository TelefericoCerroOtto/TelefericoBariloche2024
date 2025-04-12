"use client";

import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import { usePathname } from "next/navigation";

export const useLocale = () => {
  const fullPathname = usePathname();
  const firstSegment = fullPathname.split("/")[1];
  let pathname, language;

  // Si el primer segmento es un idioma válido, lo tomamos. Si no, usamos el idioma por defecto.
  if (i18n.locales.includes(firstSegment as Locales)) {
    pathname = fullPathname.replace(`/${firstSegment}`, "");
    if (pathname === "") pathname = "/";
    language = firstSegment as Locales;
  } else {
    pathname = fullPathname;
    language = i18n.defaultLocale;
  }

  return { pathname, fullPathname, language };
};
