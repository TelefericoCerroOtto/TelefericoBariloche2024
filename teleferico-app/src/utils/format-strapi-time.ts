// TODO: move to lib directory

import type { Locales } from "@/types";

// TODO: handle 24h vs 12h formats based on locale
// TODO: change function name to include locale
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
