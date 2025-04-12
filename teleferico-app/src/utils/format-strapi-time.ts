import type { Locales } from "@/types";

export const formatStrapiTime = (time: string, locale: Locales) => {
  switch (locale) {
    case "es-AR":
      return time.split(":").slice(0, 2).join(":") + " hs";

    case "en":
      return time.split(":").slice(0, 2).join(":");

    case "pt":
      const [hours, minutes] = time.split(":");
      return `${hours}h${minutes}`;

    default:
      return time;
  }
};
