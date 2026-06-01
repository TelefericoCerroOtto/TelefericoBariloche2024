import { formatPrice } from "@/lib/adapters";
import { SEASONS_TRANSLATIONS } from "@/lib/constants/enum-fields-i18n.const";
import type { Activity, Locales } from "@/types";
import {
  TableInlineText,
  TableLeadCell,
  TablePill,
  TablePreviewText,
  TableStatusPill,
  TableValueCard,
} from "../tableCells";
import { dictionaries, type ColumnKeys } from "./data";

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

    case "price": {
      const price = activity.price;

      if (price > 0) {
        return (
          <TableValueCard
            value={formatPrice(price, locale)}
            supportingText={t.price.valueHint}
            tone="brand"
          />
        );
      }

      if (price === 0) {
        return (
          <TableValueCard
            value={t.price[0]}
            supportingText={t.price.zeroHint}
          />
        );
      }

      if (price === -1) {
        return (
          <TableValueCard
            value={t.price[-1]}
            supportingText={t.price.consultHint}
          />
        );
      }

      console.log("Unknown price value: ", price);
      return <TablePill>-</TablePill>;
    }

    case "minAge": {
      const minAge = activity.minAge;

      if (minAge === 0) {
        return (
          <TablePill tone="neutral" className="text-foreground/65">
            {t.minAge[0]}
          </TablePill>
        );
      }

      if (minAge > 0) {
        return <TableInlineText>{`${minAge} ${t.minAge.unit}`}</TableInlineText>;
      }

      console.log("Unknown minAge value: ", minAge);
      return <TablePill>-</TablePill>;
    }

    case "season": {
      return (
        <TableInlineText className="text-center text-foreground/60">
          {SEASONS_TRANSLATIONS[locale][activity.season]}
        </TableInlineText>
      );
    }

    case "requirements": {
      const requirements =
        activity.activity_translations?.[0]?.requirements ?? undefined;

      return (
        <TablePreviewText text={requirements} fallback={t.requirements.none} />
      );
    }

    case "status": {
      const isAvailable = Boolean(activity.available);

      return (
        <TableStatusPill
          label={
            isAvailable ? t.availability.available : t.availability.unavailable
          }
          tone={isAvailable ? "success" : "danger"}
        />
      );
    }
  }
};
