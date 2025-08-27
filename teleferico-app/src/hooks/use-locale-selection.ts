import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import { SharedSelection } from "@heroui/react";
import { useState } from "react";

export const useLocaleSelection = (initialLocale?: Locales) => {
  const [locale, setLocale] = useState<Locales>(
    initialLocale || i18n.defaultLocale,
  );

  // <Select /> component HeroUI adapter
  const selectedKeys = new Set([locale]);
  const handleSelectionChange = (keys: SharedSelection) => {
    const first = Array.from(keys)[0] as Locales;
    setLocale(first);
  };

  return {
    locale, // clean value (Locales)
    setLocale, // manual setter
    selectedKeys, // keys used within <Select /> HeroUI component
    handleSelectionChange, // onSelectionChange of <Select /> handler
  };
};
