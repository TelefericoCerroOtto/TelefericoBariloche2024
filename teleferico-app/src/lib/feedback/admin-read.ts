import {
  normalizePeriod,
  REPORTING_TIME_ZONE,
} from "../../../packages/survey-reporting-core/src/index";
import type {
  FeedbackAdminFilters,
  FeedbackAdminReadRoute,
  FeedbackAdminReport,
  FeedbackAdminSource,
} from "@/types/api/admin/feedback";

export type { FeedbackAdminSource } from "@/types/api/admin/feedback";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const POINT_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

type QueryValue = string | readonly string[] | undefined;
export type FeedbackAdminQuery = Readonly<Record<string, QueryValue>>;

export type FeedbackAdminFilterResult =
  | { readonly ok: true; readonly value: FeedbackAdminFilters }
  | { readonly ok: false; readonly code: "VALIDATION_FAILED" };

function one(query: FeedbackAdminQuery, key: string): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) return value.length === 1 ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function hasAmbiguousSingleValue(
  query: FeedbackAdminQuery,
  keys: readonly string[],
): boolean {
  return keys.some((key) => {
    const value = query[key];
    return Array.isArray(value) && value.length !== 1;
  });
}

function all(query: FeedbackAdminQuery, key: string): readonly string[] {
  const value = query[key];
  if (value === undefined) return [];
  if (typeof value === "string") return [value];
  return value.filter((item): item is string => typeof item === "string");
}

function hasOnlyKeys(
  query: FeedbackAdminQuery,
  allowed: readonly string[],
): boolean {
  const expected = new Set(allowed);
  return Object.keys(query).every((key) => expected.has(key));
}

function isDateRange(
  from: string | undefined,
  to: string | undefined,
): from is string {
  if (!from || !to || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to))
    return false;
  try {
    const normalized = normalizePeriod({ from, to });
    const start = Date.parse(`${from}T00:00:00.000Z`);
    const end = Date.parse(`${to}T00:00:00.000Z`);
    return (
      normalized.timeZone === REPORTING_TIME_ZONE &&
      end >= start &&
      end - start < 366 * 86_400_000
    );
  } catch {
    return false;
  }
}

function pointKey(
  value: string | undefined,
  nullable = true,
): string | null | undefined {
  if (value === undefined && nullable) return null;
  if (!value || !POINT_KEY_PATTERN.test(value)) return undefined;
  return value;
}

function page(
  query: FeedbackAdminQuery,
): { readonly page: number; readonly pageSize: number } | null {
  const rawPage = one(query, "page");
  const rawPageSize = one(query, "pageSize");
  const value = rawPage === undefined ? 1 : Number(rawPage);
  const size =
    rawPageSize === undefined ? PAGE_SIZE_DEFAULT : Number(rawPageSize);
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > PAGE_SIZE_MAX
  )
    return null;
  return { page: value, pageSize: size };
}

function ratings(
  query: FeedbackAdminQuery,
): readonly (1 | 2 | 3 | 4 | 5)[] | null {
  const values = all(query, "rating").flatMap((value) => value.split(","));
  const parsed = values.map(Number);
  if (
    parsed.some((value) => !Number.isInteger(value) || value < 1 || value > 5)
  )
    return null;
  return [...new Set(parsed)] as (1 | 2 | 3 | 4 | 5)[];
}

export function parseFeedbackAdminFilters(
  route: FeedbackAdminReadRoute | "qr-points",
  query: FeedbackAdminQuery,
): FeedbackAdminFilterResult {
  if (hasAmbiguousSingleValue(query, ["from", "to"]))
    return { ok: false, code: "VALIDATION_FAILED" };
  const from = one(query, "from");
  const to = one(query, "to");
  if (!isDateRange(from, to) || !to)
    return { ok: false, code: "VALIDATION_FAILED" };

  if (route === "summary" || route === "reports") {
    if (
      hasAmbiguousSingleValue(
        query,
        route === "reports" ? ["page", "pageSize"] : [],
      )
    )
      return { ok: false, code: "VALIDATION_FAILED" };
    if (
      !hasOnlyKeys(
        query,
        route === "reports"
          ? ["from", "to", "page", "pageSize"]
          : ["from", "to"],
      )
    )
      return { ok: false, code: "VALIDATION_FAILED" };
    if (route === "summary") return { ok: true, value: { route, from, to } };
    const pagination = page(query);
    return pagination
      ? { ok: true, value: { route, from, to, ...pagination } }
      : { ok: false, code: "VALIDATION_FAILED" };
  }

  if (route === "aspects") {
    if (hasAmbiguousSingleValue(query, ["pointKey"]))
      return { ok: false, code: "VALIDATION_FAILED" };
    if (!hasOnlyKeys(query, ["from", "to", "pointKey"]))
      return { ok: false, code: "VALIDATION_FAILED" };
    const selectedPoint = pointKey(one(query, "pointKey"));
    return selectedPoint === undefined
      ? { ok: false, code: "VALIDATION_FAILED" }
      : { ok: true, value: { route, from, to, pointKey: selectedPoint } };
  }

  if (route === "qr-points") {
    if (hasAmbiguousSingleValue(query, ["view"]))
      return { ok: false, code: "VALIDATION_FAILED" };
    const view = one(query, "view");
    if (view === "comparison") {
      if (!hasOnlyKeys(query, ["from", "to", "view", "pointKeys"]))
        return { ok: false, code: "VALIDATION_FAILED" };
      const pointKeys = [
        ...new Set(
          all(query, "pointKeys").flatMap((value) => value.split(",")),
        ),
      ];
      if (
        pointKeys.length === 0 ||
        pointKeys.length > 100 ||
        pointKeys.some((value) => !POINT_KEY_PATTERN.test(value))
      )
        return { ok: false, code: "VALIDATION_FAILED" };
      return {
        ok: true,
        value: { route: "qr-comparison", from, to, pointKeys },
      };
    }
    if (view === "detail") {
      if (hasAmbiguousSingleValue(query, ["pointKey"]))
        return { ok: false, code: "VALIDATION_FAILED" };
      if (!hasOnlyKeys(query, ["from", "to", "view", "pointKey"]))
        return { ok: false, code: "VALIDATION_FAILED" };
      const selectedPoint = pointKey(one(query, "pointKey"), false);
      return selectedPoint === undefined || selectedPoint === null
        ? { ok: false, code: "VALIDATION_FAILED" }
        : {
            ok: true,
            value: { route: "qr-detail", from, to, pointKey: selectedPoint },
          };
    }
    return { ok: false, code: "VALIDATION_FAILED" };
  }

  if (
    !hasOnlyKeys(query, [
      "from",
      "to",
      "aspectKey",
      "rating",
      "pointKey",
      "locale",
      "text",
      "page",
      "pageSize",
    ])
  )
    return { ok: false, code: "VALIDATION_FAILED" };
  if (
    hasAmbiguousSingleValue(query, [
      "aspectKey",
      "pointKey",
      "locale",
      "text",
      "page",
      "pageSize",
    ])
  )
    return { ok: false, code: "VALIDATION_FAILED" };
  const pagination = page(query);
  const selectedRatings = ratings(query);
  const aspectKey = pointKey(one(query, "aspectKey"));
  const selectedPoint = pointKey(one(query, "pointKey"));
  const locale = one(query, "locale");
  const text = one(query, "text");
  if (
    !pagination ||
    !selectedRatings ||
    aspectKey === undefined ||
    selectedPoint === undefined ||
    (locale !== undefined && !["es", "en", "pt"].includes(locale)) ||
    (text !== undefined && (text.length === 0 || text.length > 200))
  )
    return { ok: false, code: "VALIDATION_FAILED" };
  return {
    ok: true,
    value: {
      route: "comments",
      from,
      to,
      aspectKey,
      ratings: selectedRatings,
      pointKey: selectedPoint,
      locale: (locale as "es" | "en" | "pt" | undefined) ?? null,
      text: text ?? null,
      ...pagination,
    },
  };
}

function localDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TIME_ZONE,
  }).format(new Date(value));
}

function inRange(value: string, from: string, to: string): boolean {
  const date = localDate(value);
  return date >= from && date <= to;
}

function paginate<T>(
  items: readonly T[],
  pageNumber: number,
  pageSize: number,
) {
  const start = (pageNumber - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function projectComments(
  source: FeedbackAdminSource,
  filters: Extract<FeedbackAdminFilters, { route: "comments" }>,
) {
  const filtered = source.comments
    .filter((comment) => inRange(comment.acceptedAt, filters.from, filters.to))
    .filter(
      (comment) =>
        filters.aspectKey === null ||
        comment.aspectRatings.some(
          ({ aspectKey }) => aspectKey === filters.aspectKey,
        ),
    )
    .filter(
      (comment) =>
        filters.ratings.length === 0 ||
        filters.ratings.includes(comment.overallRating),
    )
    .filter(
      (comment) =>
        filters.pointKey === null || comment.pointKey === filters.pointKey,
    )
    .filter(
      (comment) => filters.locale === null || comment.locale === filters.locale,
    )
    .filter(
      (comment) =>
        filters.text === null ||
        comment.text
          .toLocaleLowerCase()
          .includes(filters.text.toLocaleLowerCase()),
    )
    .sort(
      (left, right) =>
        right.acceptedAt.localeCompare(left.acceptedAt) ||
        left.receipt.localeCompare(right.receipt),
    );
  return {
    items: paginate(filtered, filters.page, filters.pageSize),
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

function intersects(
  left: FeedbackAdminReport["period"],
  right: FeedbackAdminFilters & { route: "reports" },
): boolean {
  return left.from <= right.to && left.to >= right.from;
}

export function projectReports(
  source: FeedbackAdminSource,
  filters: Extract<FeedbackAdminFilters, { route: "reports" }>,
) {
  const filtered = source.reports
    .filter((report) => intersects(report.period, filters))
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        left.reportId.localeCompare(right.reportId),
    );
  return {
    items: paginate(filtered, filters.page, filters.pageSize),
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export function projectSummary(source: FeedbackAdminSource) {
  const {
    current,
    previous,
    deltas,
    calendar,
    aspects,
    classifications,
    matrix,
    fiveStarAssociation,
    otherAspects,
  } = source.snapshot.metrics;
  const latestSuccessfulReport =
    [...source.reports].sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        left.reportId.localeCompare(right.reportId),
    )[0] ?? null;
  return {
    current,
    previous,
    deltas,
    calendar,
    strengths: classifications.strengths,
    opportunities: classifications.opportunities,
    aspects,
    matrix,
    fiveStarAssociation,
    otherAspects,
    latestSuccessfulReport,
  };
}

export function projectAspects(source: FeedbackAdminSource) {
  const {
    current,
    previous,
    deltas,
    aspects,
    matrix,
    fiveStarAssociation,
    otherAspects,
  } = source.snapshot.metrics;
  return {
    current,
    previous,
    deltas,
    aspects,
    matrix,
    fiveStarAssociation,
    otherAspects,
  };
}

export function projectQrPoints(
  source: FeedbackAdminSource,
  filters: Extract<
    FeedbackAdminFilters,
    { route: "qr-comparison" | "qr-detail" }
  >,
) {
  const points = source.snapshot.metrics.qrPoints.filter((point) => {
    if (typeof point !== "object" || point === null || !("pointKey" in point))
      return false;
    return filters.route === "qr-comparison"
      ? filters.pointKeys.includes(String(point.pointKey))
      : point.pointKey === filters.pointKey;
  });
  return {
    view: filters.route === "qr-comparison" ? "comparison" : "detail",
    points,
  };
}
