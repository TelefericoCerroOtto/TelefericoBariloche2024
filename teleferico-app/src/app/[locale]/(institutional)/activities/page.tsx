import { BlocksRenderer, NoContent } from "@/components";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { getActivities, getPageContent } from "@/lib/services";
import type { Locales } from "@/types";
import { createElement } from "react";

export default async function ActivitiesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  // TODO: El componente 'Link' devuelto en el block ImageTextBlock de Strapi tiene que poblarse con el id de la actividad.
  // Esto es, incorporar el doucmentId dentro de la respuesta para luego colocarlo el atributo href del mismo.
  const res = await getPageContent(locale, PUBLIC_ROUTES.ACTIVITIES);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok)
    throw new Error(
      "Internal server error while trying to get content for Activities page",
    );
  if (res.data.data.length === 0) return createElement(NoContent, { locale });
  const blocks = res.data.data[0].blocks;
  let filteredBlocks;

  const activitiesRes = await getActivities(locale);
  if (!activitiesRes.ok || activitiesRes.data.data.length === 0) {
    console.log(
      "Error while fetching activities in Activities page: ",
      activitiesRes.data,
    );
    filteredBlocks = blocks;
  } else {
    filteredBlocks = blocks.filter((b) => {
      if (b.__component !== "page-components.image-text-block") return true;

      const href = b.link?.href ?? "";
      const activity = activitiesRes.data.data.find((a) =>
        href.includes(a.label),
      );

      if (!activity) return true; // no es un link a actividad
      return activity.isActive; // solo mostrar si está activa
    });
  }

  return createElement(BlocksRenderer, { blocks: filteredBlocks, locale });
}
