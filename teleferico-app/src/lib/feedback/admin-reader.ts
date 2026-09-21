import "server-only";

import { ENV_KEYS } from "@/lib/constants/env.const";
import type {
  FeedbackAdminFilters,
  FeedbackAdminReadEnvelope,
} from "@/types/api/admin/feedback";

const READER_TIMEOUT_MS = 10_000;

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

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return (
    Object.keys(value).length === expected.size &&
    Object.keys(value).every((key) => expected.has(key))
  );
}

function isBoundedPopulationCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function hasValidPopulation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isBoundedPopulationCount(value.currentSubmissionCount) &&
    isBoundedPopulationCount(value.previousSubmissionCount)
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new FeedbackAdminReaderError();
  }
}

function routePath(filters: FeedbackAdminFilters): string {
  if (filters.route === "qr-comparison" || filters.route === "qr-detail")
    return "qr-points";
  return filters.route;
}

function queryString(filters: FeedbackAdminFilters): string {
  const query = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.route === "aspects" && filters.pointKey !== null)
    query.set("pointKey", filters.pointKey);
  if (filters.route === "qr-comparison") {
    query.set("view", "comparison");
    query.set("pointKeys", filters.pointKeys.join(","));
  }
  if (filters.route === "qr-detail") {
    query.set("view", "detail");
    query.set("pointKey", filters.pointKey);
  }
  if (filters.route === "comments") {
    if (filters.aspectKey !== null) query.set("aspectKey", filters.aspectKey);
    filters.ratings.forEach((rating) => query.append("rating", String(rating)));
    if (filters.pointKey !== null) query.set("pointKey", filters.pointKey);
    if (filters.locale !== null) query.set("locale", filters.locale);
    if (filters.text !== null) query.set("text", filters.text);
    query.set("page", String(filters.page));
    query.set("pageSize", String(filters.pageSize));
  }
  if (filters.route === "reports") {
    query.set("page", String(filters.page));
    query.set("pageSize", String(filters.pageSize));
  }
  return query.toString();
}

function parseEnvelope(value: unknown): FeedbackAdminReadEnvelope<unknown> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["contractVersion", "data", "meta"]) ||
    value.contractVersion !== "feedback-admin.v1" ||
    !isRecord(value.data) ||
    !isRecord(value.meta) ||
    !isRecord(value.meta.filters) ||
    !hasValidPopulation(value.meta.population)
  )
    throw new FeedbackAdminReaderError();
  return value as unknown as FeedbackAdminReadEnvelope<unknown>;
}

export function createFeedbackAdminReader(options: ReaderOptions) {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  return {
    async read(
      filters: FeedbackAdminFilters,
    ): Promise<FeedbackAdminReadEnvelope<unknown>> {
      let response: Response;
      try {
        response = await fetchImplementation(
          `${options.baseUrl.replace(/\/$/, "")}/api/tb113/admin/feedback/${routePath(filters)}?${queryString(filters)}`,
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
      return parseEnvelope(await readJson(response));
    },
  };
}

export function getFeedbackAdminReader(token: string) {
  const baseUrl = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL];
  if (!baseUrl) throw new FeedbackAdminReaderError();
  return createFeedbackAdminReader({ baseUrl, token });
}
