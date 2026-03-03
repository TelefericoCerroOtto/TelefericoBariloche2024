import { Popover } from "@/components";
import { strapiTimeToLocalizedTableTime } from "@/lib/adapters";
import { getZoneStatus } from "@/lib/helpers/getZoneStatus";
import type { GetServiceStateResponse, Locales, Zone } from "@/types";
import { truncateString } from "@/utils/truncate-string";
import { Chip } from "@heroui/react";
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

      if (!desc) return <span className="text-xl font-medium">{name}</span>;

      return (
        <div className="flex flex-col gap-1">
          <span className="text-xl font-medium">{name}</span>

          <Popover
            content={
              <div className="max-w-md p-2 text-xl leading-snug">{desc}</div>
            }
            placement="top-start"
          >
            <span className="line-clamp-2 text-xl text-default-500">
              {truncateString(desc, 100)}
            </span>
          </Popover>
        </div>
      );
    }

    case "openTime": {
      return (
        <span>{strapiTimeToLocalizedTableTime(zone[columnKey], locale)}</span>
      );
    }

    case "closeTime": {
      return (
        <span>{strapiTimeToLocalizedTableTime(zone[columnKey], locale)}</span>
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
        <Chip
          variant="flat"
          color={open ? "success" : "danger"}
          className="text-base"
        >
          {open ? t.status.open : t.status.closed}
        </Chip>
      );
    }

    default:
      return <span>-</span>;
  }
};
