"use client";

import { useLocale, useProxy } from "@/hooks";
import LogoRecortado from "@/public/logo-recortado.svg";
import type {
  GetSchedulesTranslationResponse,
  GetZonesResponse,
  Locales,
  Zone,
} from "@/types";
import { formatStrapiTime, STRAPI_ENDPOINTS } from "@/utils";
import { Button, Spinner } from "@heroui/react";
import Image from "next/image";
import { useMemo } from "react";
import { useSWRConfig } from "swr";

type ZoneSchedule = {
  id: number;
  name: string;
  description?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
};

type Translations = GetSchedulesTranslationResponse["data"][0]["jsonValue"];

interface Props {
  translations: Translations;
  zonesId: string[];
}

const TimeRow = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-100/80 px-4 py-3 text-slate-900 transition duration-200 ease-out group-hover:bg-slate-100 group-focus-visible:bg-slate-100">
      <dt className="font-medium">{label}</dt>
      <dd className="font-semibold tracking-tight">{value}</dd>
    </div>
  ) : null;

const LoadingBlock = ({
  translations,
}: {
  translations: Translations["components"]["Loading"];
}) => (
  <div
    role="status"
    className="flex flex-col items-center gap-4 py-16 text-center text-white/80"
  >
    <Spinner color="white" size="lg" />
    <p className="text-base font-medium">{translations.title}</p>
    <p className="max-w-lg text-sm text-white/60">{translations.legend}</p>
  </div>
);

const ErrorBlock = ({
  onRetry,
  translations,
}: {
  onRetry: () => void;
  translations: Translations["components"]["Error"];
}) => (
  <div
    role="alert"
    className="flex flex-col items-center gap-4 py-16 text-center text-white"
  >
    <p className="text-lg font-semibold">{translations.title}</p>
    <p className="max-w-lg text-sm text-white/70">{translations.legend}</p>
    <Button
      type="button"
      onPress={onRetry}
      className="transition-transform duration-200 ease-out hover:-translate-y-0.5"
    >
      {translations.button}
    </Button>
  </div>
);

const EmptyBlock = ({
  translations,
}: {
  translations: Translations["components"]["Empty"];
}) => (
  <div className="flex flex-col items-center gap-6 py-16 text-center text-white/80">
    <div className="relative h-24 w-24">
      <Image
        src={LogoRecortado}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain opacity-80"
      />
    </div>
    <div className="space-y-2">
      <p className="text-lg font-semibold text-white">{translations.title}</p>
      <p className="max-w-lg text-sm text-white/70">{translations.legend}</p>
    </div>
  </div>
);

function mapZoneToSchedule(zone: Zone, locale: Locales): ZoneSchedule {
  console.log("Zone data:", zone);
  const t =
    zone.zone_translations?.find((i) => i.locale === locale) ??
    zone.zone_translations?.[0];

  return {
    id: zone.id,
    description: t?.description,
    openTime: zone.openTime ?? undefined,
    closeTime: zone.closeTime ?? undefined,
    name: t?.name ?? zone.label ?? "-",
  };
}

export default function SchedulesClient(props: Props) {
  const { translations, zonesId } = props;

  const { locale } = useLocale();
  const { mutate } = useSWRConfig();

  const query = useMemo(
    () => ({
      filters: {
        documentId: { $in: zonesId },
      },
      populate: {
        zone_translations: {
          filters: { locale: { $eq: locale } },
        },
      },
    }),
    [locale, zonesId],
  );

  console.log("query:", query);

  const { data, isError, isLoading, key } = useProxy<GetZonesResponse>(
    STRAPI_ENDPOINTS.ZONES,
    query,
    { revalidateOnFocus: true },
  );

  const schedules = useMemo(() => {
    const items = (data?.data ?? [])
      .map((z) => mapZoneToSchedule(z as Zone, locale))
      .filter((i) => i.name?.trim());
    return items.sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [data, locale]);

  if (isLoading) {
    return <LoadingBlock translations={translations.components.Loading} />;
  }
  if (isError) {
    console.log(
      "Error while fetching zones info in SchedulesClient component: ",
      isError,
    );
    return (
      <ErrorBlock
        onRetry={() => key && mutate(key)}
        translations={translations.components.Error}
      />
    );
  }
  if (!schedules.length) {
    return <EmptyBlock translations={translations.components.Empty} />;
  }

  return (
    <ul role="list" className="xl:grid-cols-3 grid gap-5 sm:grid-cols-2">
      {schedules.map((s, index) => {
        const open = s.openTime ? formatStrapiTime(s.openTime, locale) : "-";
        const close = s.closeTime ? formatStrapiTime(s.closeTime, locale) : "-";

        return (
          <li key={s.id} className="h-full">
            <article
              tabIndex={0}
              className="group h-full transform rounded-2xl border border-white/10 bg-white/90 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-slate-900/80 dark:text-white"
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold leading-tight">
                  {s.name}
                </h3>
              </div>

              {s.description ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {s.description}
                </p>
              ) : null}

              <dl className="mt-6 grid gap-4 text-sm text-slate-700">
                <TimeRow label="Opens" value={open} />
                <TimeRow label="Closes" value={close} />
              </dl>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
