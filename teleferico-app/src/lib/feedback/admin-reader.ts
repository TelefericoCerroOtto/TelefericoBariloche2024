import "server-only";

import { createHash } from "node:crypto";

import { ENV_KEYS } from "@/lib/constants/env.const";
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

const READER_TIMEOUT_MS = 10_000;
const PAGE_SIZE = 100;
const MAX_SUBMISSIONS = 1_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class FeedbackAdminReaderError extends Error {
  readonly code = "UPSTREAM_UNAVAILABLE" as const;

  constructor() {
    super("Feedback administration reader unavailable");
    this.name = "FeedbackAdminReaderError";
  }
}

type ReaderOptions = {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetchImplementation?: typeof fetch;
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

function collection(value: unknown): readonly JsonRecord[] {
  if (!isRecord(value) || !Array.isArray(value.data))
    throw new FeedbackAdminReaderError();
  return value.data
    .map(unwrap)
    .filter((item): item is JsonRecord => item !== null);
}

function string(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
  const pointKey = point?.pointKey;
  const versionKey = version?.versionKey;
  if (
    !id ||
    !string(acceptedAt) ||
    !string(receipt) ||
    !["es", "en", "pt"].includes(String(locale)) ||
    !Number.isInteger(overallRating) ||
    Number(overallRating) < 1 ||
    Number(overallRating) > 5 ||
    !string(pointKey) ||
    !string(versionKey) ||
    aspects.length === 0
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
    source: string(value.source) ? value.source : "valid_qr",
    locale: locale as "es" | "en" | "pt",
    versionKey,
    pointKey,
    overallRating: Number(overallRating) as 1 | 2 | 3 | 4 | 5,
    commentText: typeof value.comment === "string" ? value.comment : null,
    aspects: validAspects,
    payloadDigest: string(value.payloadDigest)
      ? value.payloadDigest
      : sha256({
          receipt,
          acceptedAt,
          pointKey,
          versionKey,
          overallRating,
          aspects: normalizedAspects,
        }),
  };
}

function parsePoints(values: readonly JsonRecord[]) {
  return values
    .filter(
      (value) =>
        string(value.pointKey) &&
        string(value.displayName) &&
        Number.isInteger(value.sortOrder),
    )
    .map((value) => ({
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
    const aspects = Array.isArray(version.aspects) ? version.aspects : [];
    for (const raw of aspects) {
      const aspect = unwrap(raw);
      if (
        !aspect ||
        !string(aspect.aspectKey) ||
        !Number.isInteger(aspect.sortOrder)
      )
        continue;
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

function parseReports(
  values: readonly JsonRecord[],
): readonly FeedbackAdminReport[] {
  return values.flatMap((value) => {
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
      !string(createdAt)
    )
      return [];
    return [
      {
        reportId,
        reportRunId,
        name: `Feedback report ${periodStart}–${periodEnd}`,
        period: {
          from: String(periodStart).slice(0, 10),
          to: String(periodEnd).slice(0, 10),
        },
        status: "succeeded",
        analyzedResponseCount: Number.isSafeInteger(value.analyzedResponseCount)
          ? Number(value.analyzedResponseCount)
          : 0,
        analyzedCommentCount: Number.isSafeInteger(value.analyzedCommentCount)
          ? Number(value.analyzedCommentCount)
          : 0,
        dataCutoffAt: string(value.dataCutoffAt)
          ? value.dataCutoffAt
          : createdAt,
        createdAt,
        requestedBy: null,
        generatedBy: null,
        canDownload: string(value.objectKey),
        artifactSize: Number.isSafeInteger(value.artifactSize)
          ? Number(value.artifactSize)
          : 0,
        artifactSha256: string(value.artifactSha256)
          ? value.artifactSha256
          : "0".repeat(64),
      },
    ];
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

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new FeedbackAdminReaderError();
  }
}

export function createFeedbackAdminReader(options: ReaderOptions) {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const request = async (path: string, query: URLSearchParams) => {
    let response: Response;
    try {
      response = await fetchImplementation(
        `${options.baseUrl.replace(/\/$/, "")}${path}?${query.toString()}`,
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${options.token}`,
            accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(READER_TIMEOUT_MS),
        },
      );
    } catch {
      throw new FeedbackAdminReaderError();
    }
    if (!response.ok) throw new FeedbackAdminReaderError();
    return readJson(response);
  };

  const readCollection = async (
    path: string,
    query: URLSearchParams,
    max = PAGE_SIZE,
  ) => {
    const rows: JsonRecord[] = [];
    for (let page = 1; page <= Math.ceil(max / PAGE_SIZE); page += 1) {
      const pageQuery = new URLSearchParams(query);
      pageQuery.set("pagination[page]", String(page));
      pageQuery.set("pagination[pageSize]", String(PAGE_SIZE));
      const values = collection(await request(path, pageQuery));
      rows.push(...values);
      if (values.length < PAGE_SIZE) return rows;
    }
    throw new FeedbackAdminReaderError();
  };

  return {
    async read(
      filters: FeedbackAdminFilters,
    ): Promise<FeedbackAdminReadEnvelope<unknown>> {
      if (!DATE_PATTERN.test(filters.from) || !DATE_PATTERN.test(filters.to))
        throw new FeedbackAdminReaderError();
      const normalized = normalizePeriod(filters);
      const dataCutoffAt = new Date().toISOString();
      const submissionsQuery = new URLSearchParams({
        "filters[acceptedAt][$gte]": normalized.previous.utcStart,
        "filters[acceptedAt][$lte]": normalized.current.utcEnd,
        "populate[0]": "qrPoint",
        "populate[1]": "surveyVersion",
        "populate[2]": "ratings",
        "sort[0]": "acceptedAt:asc",
        "sort[1]": "receipt:asc",
      });
      const [submissionRows, pointRows, versionRows, reportRows] =
        await Promise.all([
          readCollection(
            "/api/survey-submissions",
            submissionsQuery,
            MAX_SUBMISSIONS,
          ),
          readCollection(
            "/api/survey-qr-points",
            new URLSearchParams({
              "sort[0]": "sortOrder:asc",
              "sort[1]": "pointKey:asc",
            }),
          ),
          readCollection(
            "/api/survey-versions",
            new URLSearchParams({
              "populate[0]": "aspects",
              "sort[0]": "versionKey:asc",
            }),
          ),
          readCollection(
            "/api/survey-reports",
            new URLSearchParams({ "sort[0]": "createdAt:desc" }),
          ),
        ]);
      const submissions = submissionRows.map(parseSubmission);
      if (submissions.some((item) => item === null))
        throw new FeedbackAdminReaderError();
      const snapshot = createSnapshot({
        sourceRevision: "feedback-admin.native.v1",
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

export function getFeedbackAdminReader(token: string) {
  const baseUrl = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL];
  if (!baseUrl) throw new FeedbackAdminReaderError();
  return createFeedbackAdminReader({ baseUrl, token });
}
