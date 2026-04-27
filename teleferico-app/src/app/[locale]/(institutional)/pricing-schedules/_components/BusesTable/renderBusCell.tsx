import { strapiTimeToLocalizedTableTime } from "@/lib/adapters";
import type { BusTrip, Locales } from "@/types";
import { TableLeadCell, TableValueCard } from "../tableCells";
import { ColumnKeys, dictionaries } from "./data";

export const renderBusCell = ({
  bus,
  columnKey,
  locale,
}: {
  bus: BusTrip;
  columnKey: ColumnKeys;
  locale: Locales;
}) => {
  const t = dictionaries[locale];

  switch (columnKey) {
    case "origin": {
      const station =
        bus.origin.station_translations?.[0].name || bus.origin.key || "-";

      return <TableLeadCell eyebrow={t.eyebrow.station} title={station} />;
    }

    case "destination": {
      const station =
        bus.destination.station_translations?.[0].name ||
        bus.destination.key ||
        "-";

      return <TableLeadCell eyebrow={t.eyebrow.station} title={station} />;
    }

    case "depTime": {
      return (
        <TableValueCard
          eyebrow={t.eyebrow.departure}
          value={strapiTimeToLocalizedTableTime(bus.depTime, locale)}
          supportingText={t.timeHint}
          tone="brand"
          valueClassName="font-mono tabular-nums text-primary"
        />
      );
    }

    case "arrTime": {
      return (
        <TableValueCard
          eyebrow={t.eyebrow.arrival}
          value={strapiTimeToLocalizedTableTime(bus.arrTime, locale)}
          supportingText={t.timeHint}
          valueClassName="font-mono tabular-nums"
        />
      );
    }
  }
};
