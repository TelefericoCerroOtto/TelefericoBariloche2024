import { BlockRendererClient, FormError } from "@/components";
import { getComponentTranslation } from "@/lib/services";
import type { Locales } from "@/types";

interface Props {
  locale: Locales;
}

export default async function Rules(props: Props) {
  const { locale } = props;
  const { ok, data } = await getComponentTranslation(locale, "privacy");

  if (!ok || data.data.length === 0)
    return (
      <FormError message="No se pudo recuperar el contenido de privacidad de postulación" />
    );

  return <BlockRendererClient content={data.data[0].rtValue} proseSize="lg" />;
}
