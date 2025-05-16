import { BlocksRenderer, NoContent } from "@/components";
import { getPageContent } from "@/lib/services/pages";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils/routes.const";

export default async function ActivitiesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  // TODO: El componente 'Link' devuelto en el block ImageTextBlock de Strapi tiene que poblarse con el id de la actividad.
  // Esto es, incorporar el doucmentId dentro de la respuesta para luego colocarlo el atributo href del mismo.
  const res = await getPageContent(locale, ROUTES.ACTIVITIES);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok)
    throw new Error(
      "Internal server error while trying to get content for Activities page",
    );
  if (res.data.data.length === 0) return <NoContent locale={locale} />;

  const blocks = res.data.data[0].blocks;

  return <BlocksRenderer blocks={blocks} locale={locale} />;
}
