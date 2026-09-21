import "server-only";
import { createHash } from "node:crypto";
import type { FeedbackSurveyContext } from "@/types/api/feedback";
import {
  IdempotencyReplayError,
  type AcceptanceStore,
  type StoredSubmission,
} from "./submission-acceptance";

const RESPONSE_LIMIT = 32 * 1024;

type Options = {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetchImplementation?: typeof fetch;
};

async function readJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get("content-length")) > RESPONSE_LIMIT) throw new Error("CMS response too large");
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
  try { return JSON.parse(text); } catch { throw new Error("Invalid CMS response"); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === expected.size && Object.keys(value).every((key) => expected.has(key));
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value;
}

function isLabels(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["es", "en", "pt"]) &&
    [value.es, value.en, value.pt].every((label) => typeof label === "string");
}

function isAspect(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["aspectKey", "sortOrder", "labels"]) &&
    typeof value.aspectKey === "string" && Number.isSafeInteger(value.sortOrder) && isLabels(value.labels);
}

function isVersion(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["versionKey", "status", "lastSupersededAtEpochSeconds"]) &&
    typeof value.versionKey === "string" && (value.status === "draft" || value.status === "published") &&
    (value.lastSupersededAtEpochSeconds === null || Number.isSafeInteger(value.lastSupersededAtEpochSeconds));
}

function parseSurvey(value: unknown): FeedbackSurveyContext {
  if (!isRecord(value) || !hasExactKeys(value, ["contractVersion", "pointDocumentId", "versionDocumentId", "point", "survey", "activeVersionKey", "versions"]) ||
      value.contractVersion !== "feedback-cms-public.v1" ||
      !isRecord(value.point) || !isRecord(value.survey) || !Array.isArray(value.versions) ||
      !hasExactKeys(value.point, ["pointKey", "publicCode", "displayName"]) ||
      !hasExactKeys(value.survey, ["versionKey", "versionRevision", "translations", "aspects"]) ||
      typeof value.pointDocumentId !== "string" || typeof value.versionDocumentId !== "string" ||
      typeof value.point.pointKey !== "string" || typeof value.point.publicCode !== "string" ||
      typeof value.point.displayName !== "string" || typeof value.survey.versionKey !== "string" ||
      !Number.isSafeInteger(value.survey.versionRevision) || !isRecord(value.survey.translations) ||
      !hasExactKeys(value.survey.translations, ["es", "en", "pt"]) ||
      ![value.survey.translations.es, value.survey.translations.en, value.survey.translations.pt].every(isRecord) ||
      !Array.isArray(value.survey.aspects) || !value.survey.aspects.every(isAspect) ||
      typeof value.activeVersionKey !== "string" || !value.versions.every(isVersion)) {
    throw new Error("Invalid CMS response");
  }
  return value as unknown as FeedbackSurveyContext;
}

export function createFeedbackCmsTransport(options: Options) {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const request = async (path: string, init: RequestInit = {}) => fetchImplementation(
    `${options.baseUrl.replace(/\/$/, "")}${path}`,
    { ...init, headers: { authorization: `Bearer ${options.token}`, "content-type": "application/json", ...init.headers } },
  );

  return {
    async resolveSurvey(publicCode: string): Promise<FeedbackSurveyContext | null> {
      const response = await request(`/api/tb113/public/surveys/${encodeURIComponent(publicCode)}`, { method: "GET" });
      if (response.status === 404 || response.status === 410) return null;
      if (!response.ok) throw new Error("CMS unavailable");
      return parseSurvey(await readJson(response));
    },

    acceptanceStore(context: FeedbackSurveyContext): AcceptanceStore {
      const commandContext = {
        claims: {
          pointKey: context.point.pointKey,
          publicCodeHash: createHash("sha256").update(context.point.publicCode).digest("hex"),
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
                body: JSON.stringify({ contractVersion: "feedback-cms-submission.v1", operation: "lookup", sessionNonceHash, idempotencyKey }),
              });
              if (!response.ok) throw new Error("CMS unavailable");
              const value = await readJson(response);
              if (value === null) return null;
              if (!isRecord(value) || !hasExactKeys(value, ["receipt", "acceptedAt", "payloadDigest"]) ||
                  ![value.receipt, value.acceptedAt, value.payloadDigest].every((item) => typeof item === "string")) {
                throw new Error("Invalid CMS response");
              }
              return value as Pick<StoredSubmission, "receipt" | "acceptedAt" | "payloadDigest">;
            },
            async insert(submission) {
              const response = await request("/api/tb113/public/submissions", {
                method: "POST",
                body: JSON.stringify({ contractVersion: "feedback-cms-submission.v1", operation: "accept", ...commandContext, submission }),
              });
              if (response.status === 409) throw Object.assign(new Error("Conflict"), { code: "IDEMPOTENCY_CONFLICT" });
              if (response.status === 410) throw Object.assign(new Error("Gone"), { code: "SURVEY_UNAVAILABLE" });
              if (!response.ok) throw new Error("CMS unavailable");
              if (response.status === 200) {
                const value = await readJson(response);
                if (!isRecord(value) ||
                    !hasExactKeys(value, ["submissionReceipt", "acceptedAt"]) ||
                    typeof value.submissionReceipt !== "string" ||
                    !isCanonicalTimestamp(value.acceptedAt)) {
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
