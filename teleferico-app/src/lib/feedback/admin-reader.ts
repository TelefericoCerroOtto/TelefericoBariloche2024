import "server-only";

import type {
  FeedbackAdminSourcePage,
  FeedbackAdminSourcePageQuery,
  FeedbackAdminSourceResource,
} from "./private-admin-read-transport";
import {
  createPrivateFeedbackAdminReadTransport,
  type PrivateFeedbackAdminReadTransportOptions,
} from "./private-admin-read-transport";
import {
  createSnapshot,
  normalizePeriod,
  type SnapshotSubmission,
} from "../../../packages/survey-reporting-core/src/index";
import type {
  FeedbackAdminFilters,
  FeedbackAdminReadEnvelope,
  FeedbackAdminReport,
  FeedbackAdminSource,
} from "@/types/api/admin/feedback";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class FeedbackAdminReaderError extends Error {
  readonly code = "UPSTREAM_UNAVAILABLE" as const;

  constructor() {
    super("Feedback administration reader unavailable");
    this.name = "FeedbackAdminReaderError";
  }
}

type ReaderOptions = {
  readonly readPage: (query: FeedbackAdminSourcePageQuery) => Promise<FeedbackAdminSourcePage>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrap(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const data = isRecord(value.data) ? value.data : value;
  const attributes = isRecord(data.attributes) ? data.attributes : data;
  return attributes;
}

function sourcePage(
  value: unknown,
  query: FeedbackAdminSourcePageQuery,
): FeedbackAdminSourcePage {
  const envelopeKeys = [
    "contractVersion",
    "resource",
    "cursor",
    "nextCursor",
    "total",
    "items",
  ];
  if (
    !isRecord(value) ||
    Object.keys(value).length !== envelopeKeys.length ||
    !envelopeKeys.every((key) => Object.hasOwn(value, key)) ||
    value.contractVersion !== "feedback-admin-source.v1" ||
    value.resource !== query.resource ||
    value.cursor !== query.cursor ||
    (value.nextCursor !== null && typeof value.nextCursor !== "string") ||
    !Number.isSafeInteger(value.total) ||
    Number(value.total) < 0 ||
    !Array.isArray(value.items) ||
    value.items.length > 25 ||
    !value.items.every(isRecord) ||
    (value.nextCursor !== null && value.nextCursor === query.cursor) ||
    (value.nextCursor !== null && value.items.length === 0)
  )
    throw new FeedbackAdminReaderError();
  return value as unknown as FeedbackAdminSourcePage;
}

function string(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function recordId(value: JsonRecord): string | null {
  if (string(value.documentId)) return value.documentId;
  if (typeof value.id === "number" || string(value.id)) return String(value.id);
  return string(value.receipt) ? value.receipt : null;
}

function relation(value: unknown): JsonRecord | null {
  return unwrap(value);
}

function parseSubmission(value: JsonRecord): SnapshotSubmission | null {
  const point = relation(value.qrPoint);
  const version = relation(value.surveyVersion);
  const ratings = Array.isArray(value.ratings) ? value.ratings : [];
  const aspects = ratings
    .map(unwrap)
    .filter((item): item is JsonRecord => item !== null);
  const id = recordId(value);
  const acceptedAt = value.acceptedAt;
  const receipt = value.receipt;
  const locale = value.locale;
  const overallRating = value.overallRating;
  const hasComment = Object.hasOwn(value, "comment");
  const hasPayloadDigest = Object.hasOwn(value, "payloadDigest");
  const pointKey = point?.pointKey;
  const versionKey = version?.versionKey;
  if (
    !id ||
    !string(acceptedAt) ||
    !string(receipt) ||
    value.source !== "valid_qr" ||
    !["es", "en", "pt"].includes(String(locale)) ||
    !Number.isInteger(overallRating) ||
    Number(overallRating) < 1 ||
    Number(overallRating) > 5 ||
    !string(pointKey) ||
    !string(versionKey) ||
    aspects.length === 0 ||
    !string(point?.id) ||
    !string(version?.id) ||
    !hasComment ||
    (value.comment !== null && typeof value.comment !== "string") ||
    !hasPayloadDigest ||
    !string(value.payloadDigest) ||
    !/^[a-f0-9]{64}$/.test(value.payloadDigest)
  )
    return null;
  const normalizedAspects = aspects.map((aspect) => {
    const sentiment = aspect.rating;
    if (
      !string(aspect.aspectKey) ||
      !string(aspect.label) ||
      !Number.isInteger(aspect.sortOrder) ||
      !["positive", "neutral", "negative"].includes(String(sentiment))
    )
      return null;
    return {
      aspectKey: aspect.aspectKey,
      label: aspect.label,
      sortOrder: Number(aspect.sortOrder),
      sentiment: sentiment as "positive" | "neutral" | "negative",
      ...(string(aspect.customText) ? { customText: aspect.customText } : {}),
    };
  });
  if (normalizedAspects.some((aspect) => aspect === null)) return null;
  const validAspects = normalizedAspects.filter(
    (aspect): aspect is NonNullable<typeof aspect> => aspect !== null,
  );
  return {
    recordId: id,
    receipt,
    acceptedAt,
    source: "valid_qr",
    locale: locale as "es" | "en" | "pt",
    versionKey,
    pointKey,
    overallRating: Number(overallRating) as 1 | 2 | 3 | 4 | 5,
    commentText: value.comment as string | null,
    aspects: validAspects,
    payloadDigest: value.payloadDigest,
  };
}

function parsePoints(values: readonly JsonRecord[]) {
  if (
    values.some(
      (value) =>
        !string(value.id) ||
        !string(value.documentId) ||
        !string(value.pointKey) ||
        typeof value.displayName !== "string" ||
        !Number.isInteger(value.sortOrder),
    )
  )
    throw new FeedbackAdminReaderError();
  return values.map((value) => ({
    pointKey: value.pointKey as string,
    displayName: value.displayName as string,
    sortOrder: Number(value.sortOrder),
  }));
}

function parseDefinitions(values: readonly JsonRecord[]) {
  const definitions = new Map<
    string,
    { aspectKey: string; sortOrder: number }
  >();
  for (const version of values) {
    if (
      !string(version.id) ||
      !string(version.documentId) ||
      !string(version.versionKey)
    )
      throw new FeedbackAdminReaderError();
    const aspects = Array.isArray(version.aspects) ? version.aspects : [];
    for (const raw of aspects) {
      const aspect = unwrap(raw);
      if (
        !aspect ||
        !string(aspect.id) ||
        !string(aspect.aspectKey) ||
        !Number.isInteger(aspect.sortOrder)
      )
        throw new FeedbackAdminReaderError();
      definitions.set(aspect.aspectKey, {
        aspectKey: aspect.aspectKey,
        sortOrder: Number(aspect.sortOrder),
      });
    }
  }
  return [...definitions.values()].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.aspectKey.localeCompare(right.aspectKey),
  );
}

function assertRelations(
  submissions: readonly JsonRecord[],
  points: readonly JsonRecord[],
  versions: readonly JsonRecord[],
): void {
  const pointIds = new Map(points.map((point) => [String(point.id), point.pointKey]));
  const versionIds = new Map(versions.map((version) => [String(version.id), version.versionKey]));
  for (const submission of submissions) {
    const point = relation(submission.qrPoint);
    const version = relation(submission.surveyVersion);
    if (
      !point ||
      !version ||
      pointIds.get(String(point.id)) !== point.pointKey ||
      versionIds.get(String(version.id)) !== version.versionKey
    )
      throw new FeedbackAdminReaderError();
  }
}

function parseReports(
  values: readonly JsonRecord[],
): readonly FeedbackAdminReport[] {
  return values.map((value) => {
    const id = recordId(value);
    const reportId = value.reportId;
    const reportRunId = value.generationRunId;
    const periodStart = value.periodStart;
    const periodEnd = value.periodEnd;
    const createdAt = value.createdAt;
    if (
      !id ||
      !string(reportId) ||
      !string(reportRunId) ||
      !string(periodStart) ||
      !string(periodEnd) ||
      !string(createdAt) ||
      value.status !== "succeeded" ||
      !string(value.dataCutoffAt) ||
      !Number.isSafeInteger(value.analyzedResponseCount) ||
      Number(value.analyzedResponseCount) < 0 ||
      !Number.isSafeInteger(value.analyzedCommentCount) ||
      Number(value.analyzedCommentCount) < 0 ||
      !Number.isSafeInteger(value.artifactSize) ||
      Number(value.artifactSize) < 0 ||
      value.status !== "succeeded" ||
      !Object.hasOwn(value, "requestedBy") ||
      (value.requestedBy !== null && !string(value.requestedBy)) ||
      !Object.hasOwn(value, "generatedBy") ||
      (value.generatedBy !== null && !string(value.generatedBy)) ||
      !string(value.artifactSha256) ||
      !/^[a-f0-9]{64}$/.test(value.artifactSha256)
    )
      throw new FeedbackAdminReaderError();
    return {
      reportId,
      reportRunId,
      name: `Feedback report ${periodStart}–${periodEnd}`,
      period: {
        from: String(periodStart).slice(0, 10),
        to: String(periodEnd).slice(0, 10),
      },
      status: "succeeded",
      analyzedResponseCount: Number(value.analyzedResponseCount),
      analyzedCommentCount: Number(value.analyzedCommentCount),
      dataCutoffAt: value.dataCutoffAt,
      createdAt,
      requestedBy: value.requestedBy,
      generatedBy: value.generatedBy,
      canDownload: false,
      artifactSize: Number(value.artifactSize),
      artifactSha256: value.artifactSha256,
    };
  });
}

function commentRecords(
  snapshot: FeedbackAdminSource["snapshot"],
): FeedbackAdminSource["comments"] {
  return snapshot.comments.map((comment) => ({
    recordId: comment.recordId,
    receipt: comment.receipt,
    acceptedAt: comment.acceptedAt,
    locale: comment.locale,
    pointKey: comment.pointKey,
    overallRating: comment.overallRating,
    aspectRatings: comment.aspectRatings.map(({ aspectKey, rating }) => ({
      aspectKey,
      rating,
    })),
    text: comment.text,
  }));
}

export function createFeedbackAdminReader(options: ReaderOptions) {
  if (typeof options.readPage !== "function") throw new FeedbackAdminReaderError();
  const readCollection = async (
    resource: FeedbackAdminSourceResource,
    range: { readonly acceptedAtGte: string; readonly acceptedAtLte: string },
    dataCutoffAt: string,
  ) => {
    const rows: JsonRecord[] = [];
    let expectedTotal: number | null = null;
    let cursor: string | null = null;
    const seenCursors = new Set<string>();
    const seenRows = new Set<string>();
    while (true) {
      const query = { resource, ...range, dataCutoffAt, cursor };
      let raw: unknown;
      try {
        raw = await options.readPage(query);
      } catch {
        throw new FeedbackAdminReaderError();
      }
      const result = sourcePage(raw, query);
      if (expectedTotal === null) expectedTotal = result.total;
      if (
        result.total !== expectedTotal ||
        rows.length + result.items.length > expectedTotal ||
        (result.items.length === 0 && rows.length < expectedTotal) ||
        (result.nextCursor === null && rows.length + result.items.length !== expectedTotal) ||
        (result.nextCursor !== null && rows.length + result.items.length >= expectedTotal)
      )
        throw new FeedbackAdminReaderError();
      for (const item of result.items) {
        const identity =
          resource === "submissions"
            ? item.receipt
            : resource === "reports"
              ? item.reportId
              : item.documentId;
        if (typeof identity !== "string" || identity.length === 0 || seenRows.has(identity))
          throw new FeedbackAdminReaderError();
        seenRows.add(identity);
      }
      rows.push(...result.items);
      if (result.nextCursor === null) return rows;
      if (seenCursors.has(result.nextCursor)) throw new FeedbackAdminReaderError();
      seenCursors.add(result.nextCursor);
      cursor = result.nextCursor;
    }
  };

  return {
    async read(
      filters: FeedbackAdminFilters,
    ): Promise<FeedbackAdminReadEnvelope<unknown>> {
      if (!DATE_PATTERN.test(filters.from) || !DATE_PATTERN.test(filters.to))
        throw new FeedbackAdminReaderError();
      const normalized = normalizePeriod(filters);
      const dataCutoffAt = new Date().toISOString();
      const range = {
        acceptedAtGte: normalized.previous.utcStart,
        acceptedAtLte: normalized.current.utcEnd,
      };
      const [submissionRows, pointRows, versionRows, reportRows] =
        await Promise.all([
          readCollection("submissions", range, dataCutoffAt),
          readCollection("points", range, dataCutoffAt),
          readCollection("versions", range, dataCutoffAt),
          readCollection("reports", range, dataCutoffAt),
        ]);
      assertRelations(submissionRows, pointRows, versionRows);
      const submissions = submissionRows.map(parseSubmission);
      if (submissions.some((item) => item === null))
        throw new FeedbackAdminReaderError();
      const snapshot = createSnapshot({
        sourceRevision: "feedback-admin.private.v1",
        createdAt: dataCutoffAt,
        dataCutoffAt,
        range: { from: filters.from, to: filters.to },
        filters: {
          pointKey:
            filters.route === "aspects" || filters.route === "qr-detail"
              ? filters.pointKey
              : null,
          versionKey: null,
        },
        submissions: submissions.filter(
          (item): item is SnapshotSubmission => item !== null,
        ),
        definitions: parseDefinitions(versionRows),
        points: parsePoints(pointRows),
      }).payload;
      const source = {
        snapshot,
        comments: commentRecords(snapshot),
        reports: parseReports(reportRows),
      } satisfies FeedbackAdminSource;
      return {
        contractVersion: "feedback-admin.v1",
        data: source,
        meta: { filters, population: snapshot.population },
      };
    },
  };
}

export function createConfiguredFeedbackAdminReader(
  options: PrivateFeedbackAdminReadTransportOptions,
) {
  const transport = createPrivateFeedbackAdminReadTransport(options);
  return createFeedbackAdminReader({ readPage: transport.readPage });
}

export function getFeedbackAdminReader(): ReturnType<
  typeof createFeedbackAdminReader
> {
  // No approved exact-origin/custom-token composition exists. A session JWT or
  // the public content token cannot replace this private admin action.
  throw new FeedbackAdminReaderError();
}
