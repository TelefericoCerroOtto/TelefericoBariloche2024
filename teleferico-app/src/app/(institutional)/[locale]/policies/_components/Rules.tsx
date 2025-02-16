import { BlockRendererClient, FormError } from "@/components";
import { getPolicies } from "@/lib/services";
import type { Locales } from "@/types";

interface Props {
  locale: Locales;
}

export default async function Rules(props: Props) {
  const { locale } = props;
  const { ok, data } = await getPolicies(locale);
  if (!ok)
    return (
      <FormError message="No se pudo recuperar la informacion del relgamento" />
    );

  const { rules } = data.data;

  return <BlockRendererClient content={rules} />;
}
