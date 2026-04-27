import { strapiTimeToLocalizedTableTime } from "@/lib/adapters";
import { getZoneStatus } from "@/lib/helpers/getZoneStatus";
import type { GetServiceStateResponse, Locales, Zone } from "@/types";
import {
  TableLeadCell,
  TableStatusPill,
  TableValueCard,
} from "../tableCells";
import { dictionaries, type ColumnKeys } from "./data";

export const renderZoneCell = ({
  zone,
  columnKey,
  serviceState,
  now,
  locale,
}: {
  zone: Zone;
  columnKey: ColumnKeys;
  locale: Locales;
  now: Date;
  serviceState: GetServiceStateResponse["data"]["state"] | undefined;
}) => {
  const t = dictionaries[locale];

  switch (columnKey) {
    case "name": {
      const name = zone.zone_translations?.[0]?.name || zone.label || "-";
      const desc = zone.zone_translations?.[0]?.description || "";

      return (
        <TableLeadCell
          eyebrow={t.eyebrow.zone}
          title={name}
          description={desc || undefined}
          popoverContent={
            desc ? (
              <div className="space-y-2">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-primary/80">
                  {t.eyebrow.zone}
                </p>
                <p>{desc}</p>
              </div>
            ) : undefined
          }
        />
      );
    }

    case "openTime": {
      return (
        <TableValueCard
          eyebrow={t.eyebrow.open}
          value={strapiTimeToLocalizedTableTime(zone[columnKey], locale)}
          tone="brand"
          valueClassName="font-mono tabular-nums text-primary"
        />
      );
    }

    case "closeTime": {
      return (
        <TableValueCard
          eyebrow={t.eyebrow.close}
          value={strapiTimeToLocalizedTableTime(zone[columnKey], locale)}
          valueClassName="font-mono tabular-nums"
        />
      );
    }

    case "status": {
      const status = serviceState
        ? getZoneStatus(zone, now, serviceState)
        : zone.isOpen
          ? "open"
          : "closed";

      const open = status === "open";

      return (
        <TableStatusPill
          label={open ? t.status.open : t.status.closed}
          tone={open ? "success" : "danger"}
        />
      );
    }

    default:
      return <span>-</span>;
  }
};
