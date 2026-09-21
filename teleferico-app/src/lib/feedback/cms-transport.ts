import "server-only";
import { createHash } from "node:crypto";
import type { FeedbackSurveyContext } from "@/types/api/feedback";
import {
  IdempotencyReplayError,
  type AcceptanceStore,
  type StoredSubmission,
} from "./submission-acceptance";

const RESPONSE_LIMIT = 32 * 1024;
const NATIVE_VERSION_PAGE_SIZE = 100;
const PUBLIC_CODE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

type Options = {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetchImplementation?: typeof fetch;
};

async function readJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get("content-length")) > RESPONSE_LIMIT)
    throw new Error("CMS response too large");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Invalid CMS response");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > RESPONSE_LIMIT) {
      await reader.cancel();
      throw new Error("CMS response too large");
    }
    chunks.push(value);
  }
  const text = Buffer.concat(chunks, length).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid CMS response");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const expected = new Set(keys);
  return (
    Object.keys(value).length === expected.size &&
    Object.keys(value).every((key) => expected.has(key))
  );
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = new Date(value);
  return (
    !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value
  );
}

function isLabels(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["es", "en", "pt"]) &&
    [value.es, value.en, value.pt].every((label) => typeof label === "string")
  );
}

function isAspect(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["aspectKey", "sortOrder", "labels"]) &&
    typeof value.aspectKey === "string" &&
    Number.isSafeInteger(value.sortOrder) &&
    isLabels(value.labels)
  );
}

function isVersion(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "versionKey",
      "status",
      "lastSupersededAtEpochSeconds",
    ]) &&
    typeof value.versionKey === "string" &&
    (value.status === "draft" || value.status === "published") &&
    (value.lastSupersededAtEpochSeconds === null ||
      Number.isSafeInteger(value.lastSupersededAtEpochSeconds))
  );
}

function parseSurvey(value: unknown): FeedbackSurveyContext {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "contractVersion",
      "pointDocumentId",
      "versionDocumentId",
      "point",
      "survey",
      "activeVersionKey",
      "versions",
    ]) ||
    value.contractVersion !== "feedback-cms-public.v1" ||
    !isRecord(value.point) ||
    !isRecord(value.survey) ||
    !Array.isArray(value.versions) ||
    !hasExactKeys(value.point, ["pointKey", "publicCode", "displayName"]) ||
    !hasExactKeys(value.survey, [
      "versionKey",
      "versionRevision",
      "translations",
      "aspects",
    ]) ||
    typeof value.pointDocumentId !== "string" ||
    typeof value.versionDocumentId !== "string" ||
    typeof value.point.pointKey !== "string" ||
    typeof value.point.publicCode !== "string" ||
    typeof value.point.displayName !== "string" ||
    typeof value.survey.versionKey !== "string" ||
    !Number.isSafeInteger(value.survey.versionRevision) ||
    !isRecord(value.survey.translations) ||
    !hasExactKeys(value.survey.translations, ["es", "en", "pt"]) ||
    ![
      value.survey.translations.es,
      value.survey.translations.en,
      value.survey.translations.pt,
    ].every(isRecord) ||
    !Array.isArray(value.survey.aspects) ||
    !value.survey.aspects.every(isAspect) ||
    typeof value.activeVersionKey !== "string" ||
    !value.versions.every(isVersion)
  ) {
    throw new Error("Invalid CMS response");
  }
  return value as unknown as FeedbackSurveyContext;
}

function unwrapNativeRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const candidate = isRecord(value.data) ? value.data : value;
  if (isRecord(candidate.attributes)) return candidate.attributes;
  return candidate;
}

function unwrapNativeCollection(
  value: unknown,
): readonly Record<string, unknown>[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return [];
  return value.data
    .map(unwrapNativeRecord)
    .filter((item): item is Record<string, unknown> => item !== null);
}

function nativeRelation(value: unknown): Record<string, unknown> | null {
  return unwrapNativeRecord(value);
}

function nativeAspect(
  value: unknown,
): FeedbackSurveyContext["survey"]["aspects"][number] | null {
  const record = unwrapNativeRecord(value);
  if (
    !record ||
    typeof record.aspectKey !== "string" ||
    !Number.isSafeInteger(record.sortOrder)
  )
    return null;
  const labels = isRecord(record.labels)
    ? record.labels
    : { es: record.labelEs, en: record.labelEn, pt: record.labelPt };
  if (
    !isRecord(labels) ||
    [labels.es, labels.en, labels.pt].some((item) => typeof item !== "string")
  )
    return null;
  const es = labels.es;
  const en = labels.en;
  const pt = labels.pt;
  if (
    typeof es !== "string" ||
    typeof en !== "string" ||
    typeof pt !== "string"
  )
    return null;
  const aspectKey = record.aspectKey;
  const sortOrder = record.sortOrder;
  if (typeof aspectKey !== "string" || typeof sortOrder !== "number")
    return null;
  return {
    aspectKey,
    sortOrder,
    labels: { es, en, pt },
  };
}

function nativeVersionLifecycle(
  value: unknown,
): FeedbackSurveyContext["versions"][number] | null {
  const record = unwrapNativeRecord(value);
  if (
    !record ||
    typeof record.versionKey !== "string" ||
    (record.status !== "draft" && record.status !== "published")
  )
    return null;
  const lastSupersededAt = record.lastSupersededAt;
  return {
    versionKey: record.versionKey,
    status: record.status,
    lastSupersededAtEpochSeconds:
      lastSupersededAt === null || lastSupersededAt === undefined
        ? null
        : Math.floor(new Date(String(lastSupersededAt)).getTime() / 1_000),
  };
}

function nativeSurveyContext(
  pointValue: unknown,
  settingsValue: unknown,
  versionsValue: unknown,
): FeedbackSurveyContext | null {
  if (
    !isRecord(pointValue) ||
    !Array.isArray(pointValue.data) ||
    !isRecord(settingsValue) ||
    (!isRecord(settingsValue.data) && !Array.isArray(settingsValue.data)) ||
    !isRecord(versionsValue) ||
    !Array.isArray(versionsValue.data)
  )
    throw new Error("Invalid CMS response");
  const point = unwrapNativeCollection(pointValue)[0] ?? null;
  const settingsData = settingsValue.data;
  if (Array.isArray(settingsData) && settingsData.length > 1)
    throw new Error("Invalid CMS response");
  const settings = Array.isArray(settingsData)
    ? settingsData.length === 0
      ? null
      : unwrapNativeRecord(settingsData[0])
    : unwrapNativeRecord(settingsValue);
  if (Array.isArray(settingsData) && settingsData.length === 1 && !settings)
    throw new Error("Invalid CMS response");
  const version = nativeRelation(settings?.activeSurveyVersion);
  const nativeVersions = unwrapNativeCollection(versionsValue);
  const lifecycle = nativeVersions.map(nativeVersionLifecycle);
  if (lifecycle.some((item) => item === null))
    throw new Error("Invalid CMS response");
  const validLifecycle = lifecycle.filter(
    (item): item is FeedbackSurveyContext["versions"][number] => item !== null,
  );
  if (!point || !settings || !version || validLifecycle.length === 0)
    return null;
  if (
    typeof point.documentId !== "string" ||
    typeof point.pointKey !== "string" ||
    typeof point.publicCode !== "string" ||
    typeof point.displayName !== "string" ||
    point.status !== "active" ||
    (point.inactiveAt !== null && point.inactiveAt !== undefined) ||
    settings.intakeEnabled !== true ||
    typeof settings.settingsRevision !== "number" ||
    !Number.isSafeInteger(settings.settingsRevision) ||
    typeof version.documentId !== "string" ||
    typeof version.versionKey !== "string" ||
    version.status !== "published" ||
    !isRecord(version.copyEs) ||
    !isRecord(version.copyEn) ||
    !isRecord(version.copyPt) ||
    !Array.isArray(version.aspects)
  )
    throw new Error("Invalid CMS response");
  const parsedAspects = version.aspects.map(nativeAspect);
  if (parsedAspects.some((item) => item === null))
    throw new Error("Invalid CMS response");
  const aspects = parsedAspects
    .filter(
      (item): item is FeedbackSurveyContext["survey"]["aspects"][number] =>
        item !== null,
    )
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.aspectKey.localeCompare(right.aspectKey),
    );
  if (aspects.length === 0) return null;
  return parseSurvey({
    contractVersion: "feedback-cms-public.v1",
    pointDocumentId: point.documentId,
    versionDocumentId: version.documentId,
    point: {
      pointKey: point.pointKey,
      publicCode: point.publicCode,
      displayName: point.displayName,
    },
    survey: {
      versionKey: version.versionKey,
      versionRevision: settings.settingsRevision,
      translations: {
        es: version.copyEs,
        en: version.copyEn,
        pt: version.copyPt,
      },
      aspects,
    },
    activeVersionKey: version.versionKey,
    versions: validLifecycle,
  });
}

export function createFeedbackCmsTransport(options: Options) {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const request = async (path: string, init: RequestInit = {}) =>
    fetchImplementation(`${options.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${options.token}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });

  return {
    async resolveSurvey(
      publicCode: string,
    ): Promise<FeedbackSurveyContext | null> {
      if (!PUBLIC_CODE_PATTERN.test(publicCode)) return null;
      const pointQuery = new URLSearchParams({
        "filters[publicCode][$eq]": publicCode,
        "filters[status][$eq]": "active",
        "filters[inactiveAt][$null]": "true",
        "pagination[pageSize]": "1",
      });
      const settingsQuery = new URLSearchParams({
        "populate[activeSurveyVersion][populate][0]": "aspects",
      });
      const versionsQuery = new URLSearchParams({
        "pagination[pageSize]": String(NATIVE_VERSION_PAGE_SIZE),
        "fields[0]": "versionKey",
        "fields[1]": "status",
        "fields[2]": "lastSupersededAt",
      });
      const [pointResponse, settingsResponse, versionsResponse] =
        await Promise.all([
          request(`/api/survey-qr-points?${pointQuery}`, { method: "GET" }),
          request(`/api/survey-settings?${settingsQuery}`, { method: "GET" }),
          request(`/api/survey-versions?${versionsQuery}`, { method: "GET" }),
        ]);
      if (
        [pointResponse, settingsResponse, versionsResponse].some(
          (response) => response.status === 404 || response.status === 410,
        )
      )
        return null;
      if (
        ![pointResponse, settingsResponse, versionsResponse].every(
          (response) => response.ok,
        )
      )
        throw new Error("CMS unavailable");
      return nativeSurveyContext(
        await readJson(pointResponse),
        await readJson(settingsResponse),
        await readJson(versionsResponse),
      );
    },

    acceptanceStore(context: FeedbackSurveyContext): AcceptanceStore {
      const commandContext = {
        claims: {
          pointKey: context.point.pointKey,
          publicCodeHash: createHash("sha256")
            .update(context.point.publicCode)
            .digest("hex"),
          versionKey: context.survey.versionKey,
        },
        pointDocumentId: context.pointDocumentId,
        versionDocumentId: context.versionDocumentId,
      };
      return {
        async withTransaction(operation) {
          return operation({
            async lockAndFindByIdempotency(sessionNonceHash, idempotencyKey) {
              const response = await request("/api/tb113/public/submissions", {
                method: "POST",
                body: JSON.stringify({
                  contractVersion: "feedback-cms-submission.v1",
                  operation: "lookup",
                  sessionNonceHash,
                  idempotencyKey,
                }),
              });
              if (!response.ok) throw new Error("CMS unavailable");
              const value = await readJson(response);
              if (value === null) return null;
              if (
                !isRecord(value) ||
                !hasExactKeys(value, [
                  "receipt",
                  "acceptedAt",
                  "payloadDigest",
                ]) ||
                ![value.receipt, value.acceptedAt, value.payloadDigest].every(
                  (item) => typeof item === "string",
                )
              ) {
                throw new Error("Invalid CMS response");
              }
              return value as Pick<
                StoredSubmission,
                "receipt" | "acceptedAt" | "payloadDigest"
              >;
            },
            async insert(submission) {
              const response = await request("/api/tb113/public/submissions", {
                method: "POST",
                body: JSON.stringify({
                  contractVersion: "feedback-cms-submission.v1",
                  operation: "accept",
                  ...commandContext,
                  submission,
                }),
              });
              if (response.status === 409)
                throw Object.assign(new Error("Conflict"), {
                  code: "IDEMPOTENCY_CONFLICT",
                });
              if (response.status === 410)
                throw Object.assign(new Error("Gone"), {
                  code: "SURVEY_UNAVAILABLE",
                });
              if (!response.ok) throw new Error("CMS unavailable");
              if (response.status === 200) {
                const value = await readJson(response);
                if (
                  !isRecord(value) ||
                  !hasExactKeys(value, ["submissionReceipt", "acceptedAt"]) ||
                  typeof value.submissionReceipt !== "string" ||
                  !isCanonicalTimestamp(value.acceptedAt)
                ) {
                  throw new Error("Invalid CMS response");
                }
                throw new IdempotencyReplayError(
                  value.submissionReceipt,
                  value.acceptedAt,
                );
              }
            },
          });
        },
      };
    },
  };
}
