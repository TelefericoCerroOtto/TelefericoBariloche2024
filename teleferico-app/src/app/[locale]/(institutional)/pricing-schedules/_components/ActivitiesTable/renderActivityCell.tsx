import { SEASONS_TRANSLATIONS } from "@/lib/constants/enum-fields-i18n.const";
import type { Activity, Locales } from "@/types";
import { Chip, Tooltip } from "@heroui/react";
import { dictionaries, type ColumnKeys } from "./data";
import { truncateString } from "@/utils/truncate-string";

export const renderActivityCell = ({
  activity,
  columnKey,
  locale,
}: {
  activity: Activity;
  columnKey: ColumnKeys;
  locale: Locales;
}) => {
  const t = dictionaries[locale];

  switch (columnKey) {
    case "name": {
      const name = activity.activity_translations?.[0]?.name || "-";
      const desc = activity.activity_translations?.[0]?.description || "";

      if (!desc) return <span className="text-xl font-medium">{name}</span>;

      return (
        <div className="flex flex-col gap-1">
          <span className="text-xl font-medium">{name}</span>

          <Tooltip
            content={
              <div className="max-w-md p-2 text-xl leading-snug">{desc}</div>
            }
            placement="top-start"
          >
            <span className="line-clamp-2 text-xl text-default-500">
              {truncateString(desc, 100)}
            </span>
          </Tooltip>
        </div>
      );
    }

    case "price": {
      const price = activity.price;

      if (price > 0) {
        return (
          <span className="font-medium">
            {t.price.prefix}
            {price}
          </span>
        );
      }

      if (price === 0) {
        return <span className="font-medium">{t.price[0]}</span>;
      }

      if (price === -1) {
        return <span className="font-medium">{t.price[-1]}</span>;
      }

      console.log("Unknown price value: ", price);
      return <span className="font-medium">-</span>;
    }

    case "minAge": {
      const minAge = activity.minAge;

      if (minAge === 0) return <span>{t.minAge[0]}</span>;

      if (minAge > 0) {
        return (
          <span>
            {minAge} {t.minAge.unit}
          </span>
        );
      }

      console.log("Unknown minAge value: ", minAge);
      return <span>-</span>;
    }

    case "season": {
      const season = activity.season;

      return <span>{SEASONS_TRANSLATIONS[locale][season]}</span>;
    }

    case "requirements":
      const requirements = activity.activity_translations?.[0]?.requirements;

      if (!requirements) return <span>{t.requirements.none}</span>;
      return <span>{requirements}</span>;

    case "status": {
      const isAvailable = Boolean(activity.available);
      return (
        <Chip
          variant="flat"
          color={isAvailable ? "success" : "danger"}
          className="text-base"
        >
          {isAvailable ? t.availability.available : t.availability.unavailable}
        </Chip>
      );
    }
  }
};
