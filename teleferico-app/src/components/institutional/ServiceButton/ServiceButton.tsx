import { getComponentTranslation } from "@/lib/services";
import type { Locales } from "@/types";
import ServiceButtonClient from "./ServiceButtonClient";
import { FormError } from "@/components/shared";

interface Props {
  locale: Locales;
}

const ERR_MSG = {
  "es-AR": "No se pudo recuperar el contenido del componente",
  en: "The component's content could not be retrieved.",
  pt: "Não foi possível recuperar o conteúdo do componente.",
};

export default async function ServiceButton(props: Props) {
  const { locale } = props;
  const { ok, data } = await getComponentTranslation(locale, "servicebutton");

  if (!ok) {
    return (
      <div className="sticky bottom-10 z-50 mt-10 flex w-full justify-end px-10">
        <div className="rounded-md bg-red-100 p-2">
          <FormError message={ERR_MSG[locale]} />
        </div>
      </div>
    );
  }

  return <ServiceButtonClient content={data.data[0].jsonValue} />;
}
