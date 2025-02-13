import { BlocksRenderer } from "@/components";
import { getActivitiesPageContent } from "@/lib/services/pages";
import type { Locales } from "@/types";

export default async function ActivitiesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  // TODO: El componente 'Link' devuelto en el block ImageTextBlock de Strapi tiene que poblarse con el id de la actividad.
  // Esto es, incorporar el doucmentId dentro de la respuesta para luego colocarlo el atributo href del mismo.
  const res = await getActivitiesPageContent(locale);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok) return <div>Fallback data</div>;

  const blocks = res.data.data[0].blocks;

  console.log("blocks", blocks);
  return <BlocksRenderer blocks={blocks} locale={locale} />;
}
