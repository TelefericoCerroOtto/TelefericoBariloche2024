import type { FeedbackAdminGeneration } from "@/types/api/admin/feedback";

const REPORT_NAME_DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires",
});

/** Keep the overlap name identical to the report-history fallback until the UI uses this helper. */
export function reportHistoryName(
  item: Pick<FeedbackAdminGeneration, "displayName" | "createdAt"> & {
    readonly report: Pick<NonNullable<FeedbackAdminGeneration["report"]>, "createdAt"> | null;
  },
): string {
  if (item.displayName) return item.displayName;
  const date = new Date(item.report?.createdAt ?? item.createdAt);
  return Number.isNaN(date.getTime())
    ? "Informe"
    : `Informe - ${REPORT_NAME_DATE_FORMAT.format(date).replace(",", "")}`;
}
