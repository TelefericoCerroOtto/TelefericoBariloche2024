import { getComponentTranslation } from "@/lib/services";
import type { Locales } from "@/types";
import ServiceStatusButtonClient from "./ServiceStatusButtonClient";
import { FormError } from "@/components/shared";
import { Skeleton } from "@heroui/react";
import { Suspense } from "react";

interface Props {
  locale: Locales;
}

const ERR_MSG = {
  "es-AR": "No se pudo recuperar el contenido del componente",
  en: "The component's content could not be retrieved.",
  pt: "Não foi possível recuperar o conteúdo do componente.",
};

export default async function ServiceStatusButton(props: Props) {
  const { locale } = props;
  const { ok, data } = await getComponentTranslation(locale, "servicebutton");

  if (!ok) {
    return (
      <div className="sticky bottom-6 z-50 mt-10 flex w-full justify-end px-4 sm:px-6">
        <div className="max-w-md rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FormError message={ERR_MSG[locale]} />
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <Skeleton className="h-36 w-11/12 sm:h-40 sm:w-3/4 lg:h-44 lg:w-1/2" />
      }
    >
      <div className="mb-10 w-11/12 sm:mb-12 sm:w-3/4 lg:mb-14 lg:w-1/2">
        <ServiceStatusButtonClient
          content={data.data[0].jsonValue}
          locale={locale}
        />
      </div>
    </Suspense>
  );
}
