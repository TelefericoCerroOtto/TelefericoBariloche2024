import {
  REPORTING_TIME_ZONE,
  type CalendarUnit,
  type DateRange,
  type NormalizedDateRange,
} from "./contracts";

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const zoneFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORTING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function dateEpoch(date: string): number {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Invalid local date: ${date}`);
  const value = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (new Date(value).toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Invalid local date: ${date}`);
  }
  return value;
}

function formatDate(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return formatDate(dateEpoch(date) + days * DAY_MS);
}

function zoneOffset(epoch: number): number {
  const parts = Object.fromEntries(
    zoneFormatter.formatToParts(epoch).map(({ type, value }) => [type, value]),
  );
  return (
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ) - epoch
  );
}

function localMidnight(date: string): number {
  const desired = dateEpoch(date);
  let result = desired - zoneOffset(desired);
  result = desired - zoneOffset(result);
  return result;
}

function normalizeRange(range: DateRange): NormalizedDateRange {
  if (dateEpoch(range.from) > dateEpoch(range.to)) throw new RangeError("Period start exceeds end");
  return {
    ...range,
    utcStart: new Date(localMidnight(range.from)).toISOString(),
    utcEnd: new Date(localMidnight(addDays(range.to, 1)) - 1).toISOString(),
  };
}

export function normalizePeriod(range: DateRange): {
  readonly timeZone: typeof REPORTING_TIME_ZONE;
  readonly current: NormalizedDateRange;
  readonly previous: NormalizedDateRange;
} {
  const inclusiveDays = (dateEpoch(range.to) - dateEpoch(range.from)) / DAY_MS + 1;
  const current = normalizeRange(range);
  const previousTo = addDays(range.from, -1);
  return {
    timeZone: REPORTING_TIME_ZONE,
    current,
    previous: normalizeRange({ from: addDays(previousTo, 1 - inclusiveDays), to: previousTo }),
  };
}

export function buildCalendarBuckets(range: DateRange, unit: CalendarUnit): DateRange[] {
  normalizeRange(range);
  const buckets: DateRange[] = [];
  let from = range.from;
  while (dateEpoch(from) <= dateEpoch(range.to)) {
    const date = new Date(dateEpoch(from));
    let next: string;
    if (unit === "day") next = addDays(from, 1);
    else if (unit === "week") next = addDays(from, 7 - ((date.getUTCDay() + 6) % 7));
    else next = formatDate(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const candidateTo = addDays(next, -1);
    const to = dateEpoch(candidateTo) < dateEpoch(range.to) ? candidateTo : range.to;
    buckets.push({ from, to });
    from = next;
  }
  return buckets;
}
