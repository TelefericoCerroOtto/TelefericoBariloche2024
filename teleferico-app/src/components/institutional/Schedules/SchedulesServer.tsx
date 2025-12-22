import { FormError } from "@/components/shared";
import { getComponentTranslation } from "@/lib/services";
import Gondola from "@/public/gondola.svg";
import type { Locales } from "@/types";
import Image from "next/image";
import SchedulesClient from "./SchedulesClient";

interface Props {
  locale: Locales;
  zonesId: string[];
}

export default async function SchedulesServer(props: Props) {
  const { locale, zonesId } = props;
  const { ok, data } = await getComponentTranslation(locale, "schedules");

  if (!ok || !data)
    return (
      <FormError message="Algo salió mal al recuperar las traducciones del componente Schedules" />
    );

  const translations = data.data?.[0]?.jsonValue;
  if (!translations)
    return (
      <FormError
        message={`No existe traducciones para el componente Schedules en el idioma "${locale}"`}
      />
    );

  return (
    <section
      aria-labelledby="schedules-heading"
      className="relative isolate overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-10 text-white shadow-2xl"
    >
      <div className="pointer-events-none absolute -right-6 -top-10 hidden h-48 w-48 rotate-12 opacity-80 blur-sm md:block">
        <Image
          aria-hidden="true"
          src={Gondola}
          alt=""
          className="h-full w-full object-contain"
          priority
        />
      </div>

      <header className="relative z-10 flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3 sm:max-w-2xl">
          <p className="text-base font-semibold uppercase tracking-[0.3em] text-white/70">
            {translations.header.epigraph}
          </p>
          <h2
            id="schedules-heading"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {translations.header.title}
          </h2>
          <p className="max-w-xl text-lg text-white/80">
            {translations.header.legend}
          </p>
        </div>
      </header>

      <div className="relative z-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <SchedulesClient translations={translations} zonesId={zonesId} />
      </div>
    </section>
  );
}
