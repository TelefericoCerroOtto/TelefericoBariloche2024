import { BusTrip, Locales } from "@/types";
import { ColumnKeys } from "./data";
import { strapiTimeToLocalizedTableTime } from "@/lib/adapters";

export const renderBusCell = ({
  bus,
  columnKey,
  locale,
}: {
  bus: BusTrip;
  columnKey: ColumnKeys;
  locale: Locales;
}) => {
  switch (columnKey) {
    case "origin": {
      const station =
        bus.origin.station_translations?.[0].name || bus.origin.key || "-";

      return <span>{station}</span>;
    }

    case "destination": {
      const station =
        bus.destination.station_translations?.[0].name ||
        bus.destination.key ||
        "-";

      return <span>{station}</span>;
    }

    case "depTime": {
      return <span>{strapiTimeToLocalizedTableTime(bus.depTime, locale)}</span>;
    }

    case "arrTime": {
      return <span>{strapiTimeToLocalizedTableTime(bus.arrTime, locale)}</span>;
    }
  }
};
