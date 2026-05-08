import { BlockRendererClient, FormError } from "@/components";
import { getComponentTranslation } from "@/lib/services";
import type { Locales } from "@/types";

interface Props {
  locale: Locales;
}

export default async function Rules(props: Props) {
  const { locale } = props;
  const { ok, data } = await getComponentTranslation(locale, "privacy");

  if (!ok)
    return (
      <FormError message="No se pudo recuperar el contenido de privacidad de postulación" />
    );

  const [privacy] = data.data;

  if (!privacy)
    return (
      <FormError message="No se pudo recuperar el contenido de privacidad de postulación" />
    );

  return <BlockRendererClient content={privacy.rtValue} proseSize="lg" />;
}
