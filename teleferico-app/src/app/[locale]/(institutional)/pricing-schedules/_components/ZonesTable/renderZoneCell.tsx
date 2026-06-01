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
          title={name}
          description={desc || undefined}
          popoverContent={
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              {desc ? <p className="text-xs sm:text-sm text-foreground/80">{desc}</p> : null}
            </div>
          }
        />
      );
    }

    case "openTime": {
      return (
        <TableValueCard
          value={strapiTimeToLocalizedTableTime(zone[columnKey], locale)}
          tone="brand"
          valueClassName="font-mono tabular-nums"
        />
      );
    }

    case "closeTime": {
      return (
        <TableValueCard
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
