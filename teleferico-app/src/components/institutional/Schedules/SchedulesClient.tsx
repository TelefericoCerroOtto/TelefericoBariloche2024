"use client";

import { useLocale, useProxy, useServiceState } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import LogoRecortado from "@/public/logo-recortado.svg";
import type {
  GetSchedulesTranslationResponse,
  GetServiceStateResponse,
  GetZonesResponse,
  Locales,
  Zone,
} from "@/types";
import { formatStrapiTime } from "@/utils";
import { Button, Spinner, Tooltip } from "@heroui/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";

type ZoneSchedule = {
  id: number;
  name: string;
  description: string | undefined | null;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

type Translations = GetSchedulesTranslationResponse["data"][0]["jsonValue"];

type ZoneStatus = "open" | "closed";

const badgeStyles: Record<ZoneStatus, string> = {
  open: "bg-emerald-100 text-emerald-700",
  closed: "bg-rose-100 text-rose-700",
};

const REFRESH_INTERVAL_MS = 60 * 1000; // 1 min

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
  const t =
    zone.zone_translations?.find((i) => i.locale === locale) ??
    zone.zone_translations?.[0];

  return {
    id: zone.id,
    description: t?.description,
    isOpen: zone.isOpen ?? false,
    openTime: zone.openTime ?? undefined,
    closeTime: zone.closeTime ?? undefined,
    name: t?.name ?? zone.label ?? "-",
  };
}

function createDateFromStrapiTime(time: string | undefined) {
  if (!time) {
    return null;
  }

  const [hoursStr, minutesStr, secondsStr] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const seconds = Number(secondsStr ?? "0");

  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

function getZoneStatus(
  zone: ZoneSchedule,
  reference: Date,
  serviceState: GetServiceStateResponse["data"]["state"],
): ZoneStatus {
  const openDate = createDateFromStrapiTime(zone.openTime);
  const closeDate = createDateFromStrapiTime(zone.closeTime);

  if (serviceState === "closed" || serviceState === "suspended") {
    return "closed";
  }

  if (!openDate || !closeDate) {
    return zone.isOpen ? "open" : "closed";
  }

  const nowTime = reference.getTime();
  const closeTime = closeDate.getTime();
  const openTime = openDate.getTime();

  if (nowTime >= closeTime && nowTime < openTime) {
    return "closed";
  }

  if (nowTime >= openTime && nowTime < closeTime) {
    return zone.isOpen ? "open" : "closed";
  }

  return "closed";
}

export default function SchedulesClient(props: Props) {
  const { translations, zonesId } = props;

  const { locale } = useLocale();
  const { mutate } = useSWRConfig();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

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

  const {
    serviceState,
    isError: isErrorServiceState,
    isLoading: isLoadingServiceState,
  } = useServiceState();
  const { data, isError, isLoading, key } = useProxy<GetZonesResponse>(
    STRAPI_ENDPOINTS.ZONES,
    query,
    { refreshInterval: REFRESH_INTERVAL_MS },
  );

  const schedules = useMemo(() => {
    const items = (data?.data ?? [])
      .map((z) => mapZoneToSchedule(z as Zone, locale))
      .filter((i) => i.name?.trim());
    return items.sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [data, locale]);

  if (isLoading || isLoadingServiceState) {
    return <LoadingBlock translations={translations.components.Loading} />;
  }
  if (isError || isErrorServiceState) {
    console.log(
      "Error while fetching zones info in SchedulesClient component: ",
      isError,
      "\n",
      isErrorServiceState,
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
        const status = getZoneStatus(s, now, serviceState!.data.state);
        const badgeText = translations.badge[status];

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
                {s.description ? (
                  <Tooltip content={s.description} placement="top">
                    <p className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-gray-800 text-base font-bold text-white">
                      ?
                    </p>
                  </Tooltip>
                ) : null}
              </div>

              {/*BADGE*/}
              <span
                className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${badgeStyles[status]}`}
              >
                {badgeText}
              </span>

              <dl className="mt-6 grid gap-4 text-base text-slate-700">
                <TimeRow
                  label={translations.components.TimeRow.opens}
                  value={open}
                />
                <TimeRow
                  label={translations.components.TimeRow.closes}
                  value={close}
                />
              </dl>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
