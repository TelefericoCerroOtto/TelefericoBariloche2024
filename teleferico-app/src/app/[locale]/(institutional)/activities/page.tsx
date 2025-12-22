import { BlocksRenderer, NoContent } from "@/components";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { getPageContent } from "@/lib/services";
import type { Locales } from "@/types";

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
  if (res.data.data.length === 0) return <NoContent locale={locale} />;

  const blocks = res.data.data[0].blocks;

  return (
    <BlocksRenderer
      config={{ "image-text-block": { baseUrl: PUBLIC_ROUTES.ACTIVITIES } }}
      blocks={blocks}
      locale={locale}
    />
  );
}
