import "server-only";

import { ENV_KEYS } from "@/lib/constants/env.const";
import {
  createFeedbackTaskName,
  createUnavailableFeedbackDispatcher,
  type FeedbackReportDispatcher,
  type FeedbackDispatchResult,
} from "./dispatch";
import {
  normalizePeriod,
  REPORTING_TIME_ZONE,
} from "../../../packages/survey-reporting-core/src/index";
import type {
  FeedbackAdminCommandResult,
  FeedbackAdminCommandStatus,
  FeedbackAdminDateRange,
  FeedbackAdminGenerateCommand,
  FeedbackAdminOverlapDetails,
  FeedbackAdminRetryCommand,
} from "@/types/api/admin/feedback";
import {
  buildGenerationData,
  buildOverlapDetails,
  prepareRetryGeneration,
} from "./generation-lifecycle";
import {
  buildAuthoritativeGenerationInputsV1,
  type AuthoritativeGenerationSourceInputV1,
  type GenerationSourcePageQueryV1,
} from "../../../services/survey-report-worker/src/authoritative-generation-source";
import type { MaterializedGenerationInputsV1 } from "../../../services/survey-report-worker/src/generation-inputs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const GENERATION_ENDPOINT = "/api/survey-report-generations";
const DISPATCH_FAILURE_ENDPOINT = "/api/tb113/admin/generations";

type RecordValue = Record<string, unknown>;
type CommandResult =
  | { readonly ok: true; readonly value: FeedbackAdminGenerateCommand }
  | { readonly ok: false; readonly code: "VALIDATION_FAILED" };
type RetryResult =
  | { readonly ok: true; readonly value: FeedbackAdminRetryCommand }
  | { readonly ok: false; readonly code: "VALIDATION_FAILED" };
type CoreCommandResult = Omit<FeedbackAdminCommandResult, "dispatch">;
type CoreGeneration = FeedbackAdminDateRange & {
  readonly documentId: string;
  readonly reportRunId: string;
  readonly status: FeedbackAdminCommandStatus;
  readonly stateVersion?: number;
};

function isVerifiedDispatchExhaustion(
  value: unknown,
  reportRunId: string,
): value is Extract<FeedbackDispatchResult, { status: "exhausted" }> {
  return (
    isRecord(value) &&
    exact(value, [
      "contractVersion",
      "status",
      "noTaskCreated",
      "taskName",
      "dispatchAttemptCount",
      "failureCode",
    ]) &&
    value.contractVersion === "survey-dispatch-command.v1" &&
    value.status === "exhausted" &&
    value.noTaskCreated === true &&
    createFeedbackTaskName(reportRunId) !== null &&
    value.taskName === createFeedbackTaskName(reportRunId) &&
    value.dispatchAttemptCount === 3 &&
    value.failureCode === "QUEUE_ENQUEUE_EXHAUSTED"
  );
}

export class FeedbackAdminCommandError extends Error {
  readonly code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "VALIDATION_FAILED"
    | "PAYLOAD_TOO_LARGE"
    | "OVERLAP_REQUIRES_OVERRIDE"
    | "ACTIVE_RANGE_CONFLICT"
    | "INVALID_STATE"
    | "UPSTREAM_UNAVAILABLE"
    | "INTERNAL_ERROR";
  readonly status: number;
  readonly details?: FeedbackAdminOverlapDetails;

  constructor(
    code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "VALIDATION_FAILED"
      | "PAYLOAD_TOO_LARGE"
      | "OVERLAP_REQUIRES_OVERRIDE"
      | "ACTIVE_RANGE_CONFLICT"
      | "INVALID_STATE"
      | "UPSTREAM_UNAVAILABLE"
      | "INTERNAL_ERROR",
    status: number,
    details?: FeedbackAdminOverlapDetails,
  ) {
    super("Feedback administration command failed");
    this.name = "FeedbackAdminCommandError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function safeGenerationData(
  ...args: Parameters<typeof buildGenerationData>
) {
  try {
    return buildGenerationData(...args);
  } catch {
    throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
  }
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: RecordValue, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return (
    Object.keys(value).length === expected.size &&
    Object.keys(value).every((key) => expected.has(key))
  );
}

function validDateRange(value: unknown): value is FeedbackAdminDateRange {
  if (
    !isRecord(value) ||
    !exact(value, ["from", "to"]) ||
    typeof value.from !== "string" ||
    typeof value.to !== "string"
  )
    return false;
  if (!DATE_PATTERN.test(value.from) || !DATE_PATTERN.test(value.to))
    return false;
  try {
    const start = Date.parse(`${value.from}T00:00:00.000Z`);
    const end = Date.parse(`${value.to}T00:00:00.000Z`);
    return (
      normalizePeriod({ from: value.from, to: value.to }).timeZone ===
        REPORTING_TIME_ZONE &&
      end >= start &&
      end - start < 366 * 86_400_000
    );
  } catch {
    return false;
  }
}

export function parseGenerateCommand(value: unknown): CommandResult {
  if (
    !isRecord(value) ||
    !exact(value, ["contractVersion", "period", "override"]) ||
    value.contractVersion !== "feedback-admin.v1" ||
    !validDateRange(value.period) ||
    !isRecord(value.override) ||
    !exact(value.override, ["accepted", "overlapDigest"]) ||
    typeof value.override.accepted !== "boolean" ||
    (value.override.overlapDigest !== null &&
      (typeof value.override.overlapDigest !== "string" ||
        !DIGEST_PATTERN.test(value.override.overlapDigest)))
  )
    return { ok: false, code: "VALIDATION_FAILED" };
  return { ok: true, value: value as unknown as FeedbackAdminGenerateCommand };
}

export function parseRetryCommand(value: unknown): RetryResult {
  return isRecord(value) &&
    exact(value, ["contractVersion"]) &&
    value.contractVersion === "feedback-admin.v1"
    ? { ok: true, value: value as unknown as FeedbackAdminRetryCommand }
    : { ok: false, code: "VALIDATION_FAILED" };
}

function asCoreGeneration(value: unknown): CoreGeneration | undefined {
  if (!isRecord(value)) return undefined;
  const attributes = isRecord(value.attributes) ? value.attributes : value;
  const documentId =
    typeof value.documentId === "string"
      ? value.documentId
      : typeof value.id === "string"
        ? value.id
        : undefined;
  if (
    !documentId ||
    typeof attributes.reportRunId !== "string" ||
    typeof attributes.periodStart !== "string" ||
    typeof attributes.periodEnd !== "string" ||
    !["queued", "running", "succeeded", "failed"].includes(
      String(attributes.status),
    )
  )
    return undefined;
  return {
    documentId,
    reportRunId: attributes.reportRunId,
    from: attributes.periodStart,
    to: attributes.periodEnd,
    status: attributes.status as FeedbackAdminCommandStatus,
    ...(Number.isSafeInteger(attributes.stateVersion)
      ? { stateVersion: attributes.stateVersion as number }
      : {}),
  };
}

function coreResult(value: unknown): CoreCommandResult {
  if (!isRecord(value))
    throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
  const row = asCoreGeneration(value.data);
  if (!row) throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
  return {
    reportRunId: row.reportRunId,
    status: row.status,
    ...(row.stateVersion === undefined ? {} : { stateVersion: row.stateVersion }),
  };
}

const ERROR_CODES = new Set<FeedbackAdminCommandError["code"]>([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "VALIDATION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "OVERLAP_REQUIRES_OVERRIDE",
  "ACTIVE_RANGE_CONFLICT",
  "INVALID_STATE",
  "UPSTREAM_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

async function json(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

type Options = {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetchImplementation?: typeof fetch;
  readonly dispatcher?: FeedbackReportDispatcher;
  readonly generationInputs?: GenerationInputsPort;
};

type ApprovedGenerationConfiguration = Pick<
  AuthoritativeGenerationSourceInputV1,
  "sourceRevision" | "modelConfig" | "pricingSnapshot" | "evidenceKeyId"
>;

export type GenerationInputsPort = {
  readonly readPage: (
    query: GenerationSourcePageQueryV1,
  ) => Promise<unknown>;
  readonly getApprovedConfiguration: () =>
    | ApprovedGenerationConfiguration
    | Promise<ApprovedGenerationConfiguration>;
};

export function createFeedbackAdminCommandTransport(options: Options) {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const dispatcher =
    options.dispatcher ?? createUnavailableFeedbackDispatcher();
  const request = (path: string, init: RequestInit = {}) =>
    fetchImplementation(`${options.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${options.token}`,
        "content-type": "application/json",
        accept: "application/json",
        ...init.headers,
      },
    });

  const coreRequest = async (
    path: string,
    init: RequestInit = {},
    conflictCode: "ACTIVE_RANGE_CONFLICT" | "INVALID_STATE" = "ACTIVE_RANGE_CONFLICT",
  ) => {
    let response: Response;
    try {
      response = await request(path, init);
    } catch {
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    }
    const value = await json(response);
    if (!response.ok) {
      const errorValue =
        isRecord(value) && isRecord(value.error) ? value.error : {};
      const errorCode =
        typeof errorValue.code === "string" &&
        ERROR_CODES.has(errorValue.code as FeedbackAdminCommandError["code"])
          ? (errorValue.code as FeedbackAdminCommandError["code"])
          : response.status === 401
            ? "UNAUTHORIZED"
            : response.status === 403
              ? "FORBIDDEN"
              : response.status === 400
                ? "VALIDATION_FAILED"
                : response.status === 409
                  ? conflictCode
                  : response.status === 413
                    ? "PAYLOAD_TOO_LARGE"
                    : "UPSTREAM_UNAVAILABLE";
      throw new FeedbackAdminCommandError(errorCode, response.status);
    }
    return value;
  };

  const dispatch = async (result: CoreCommandResult, dispatchResult: FeedbackDispatchResult) => {
    if (
      !isRecord(dispatchResult) ||
      dispatchResult.contractVersion !== "survey-dispatch-command.v1"
    )
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    if (dispatchResult.status !== "exhausted") {
      if (dispatchResult.status !== "queued" && dispatchResult.status !== "dispatched")
        throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
      return { ...result, dispatch: dispatchResult };
    }
    if (!isVerifiedDispatchExhaustion(dispatchResult, result.reportRunId))
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    if (!Number.isSafeInteger(result.stateVersion) || result.stateVersion! < 1)
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    const response = await coreRequest(
      `${DISPATCH_FAILURE_ENDPOINT}/${result.reportRunId}/dispatch-failure`,
      {
        method: "POST",
        body: JSON.stringify({
          contractVersion: "survey-dispatch-command.v1",
          expectedStateVersion: result.stateVersion,
          taskName: dispatchResult.taskName,
          dispatchAttemptCount: dispatchResult.dispatchAttemptCount,
          failureCode: dispatchResult.failureCode,
        }),
      },
      "INVALID_STATE",
    );
    if (
      !isRecord(response) ||
      response.contractVersion !== "survey-dispatch-command.v1" ||
      response.reportRunId !== result.reportRunId ||
      response.status !== "failed" ||
      response.failureCode !== "QUEUE_ENQUEUE_EXHAUSTED" ||
      typeof response.replayed !== "boolean" ||
      !Number.isSafeInteger(response.stateVersion)
    )
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    return {
      ...result,
      status: "failed" as const,
      dispatch: {
        contractVersion: "survey-dispatch-command.v1" as const,
        status: "failed" as const,
        failureCode: "QUEUE_ENQUEUE_EXHAUSTED" as const,
        replayed: response.replayed,
      },
    };
  };

  const dispatchCreated = async (result: CoreCommandResult) => {
    const taskName = createFeedbackTaskName(result.reportRunId);
    if (!taskName)
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    let dispatchResult: FeedbackDispatchResult;
    try {
      dispatchResult = await dispatcher.dispatch({
        reportRunId: result.reportRunId,
        taskName,
      });
    } catch {
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    }
    return dispatch(result, dispatchResult);
  };

  const materializeGenerationInputs = async (
    period: FeedbackAdminDateRange,
    cutoff: Date,
  ): Promise<MaterializedGenerationInputsV1> => {
    if (!options.generationInputs)
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    try {
      const configuration =
        await options.generationInputs.getApprovedConfiguration();
      return await buildAuthoritativeGenerationInputsV1({
        ...configuration,
        range: period,
        dataCutoffAt: cutoff.toISOString(),
        readPage: options.generationInputs.readPage,
      });
    } catch {
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    }
  };

  const list = async (period: FeedbackAdminDateRange) => {
    const query = new URLSearchParams({
      "filters[periodStart][$lte]": period.to,
      "filters[periodEnd][$gte]": period.from,
      "pagination[pageSize]": "100",
    });
    const value = await coreRequest(`${GENERATION_ENDPOINT}?${query}`);
    if (!isRecord(value) || !Array.isArray(value.data))
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    return value.data.map(asCoreGeneration).filter((row) => row !== undefined);
  };

  const find = async (reportRunId: string) => {
    const query = new URLSearchParams({
      "filters[reportRunId][$eq]": reportRunId,
      "pagination[pageSize]": "1",
    });
    const value = await coreRequest(`${GENERATION_ENDPOINT}?${query}`);
    if (!isRecord(value) || !Array.isArray(value.data))
      throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
    return asCoreGeneration(value.data[0]);
  };

  const create = async (
    command: FeedbackAdminGenerateCommand,
    source?: CoreGeneration,
    cutoff = new Date(),
  ) => {
    const materializedInputs = await materializeGenerationInputs(
      source ? { from: source.from, to: source.to } : command.period,
      cutoff,
    );
    const data = safeGenerationData(
      command,
      cutoff,
      materializedInputs,
      undefined,
      source
        ? {
            documentId: source.documentId,
            reportRunId: source.reportRunId,
            period: { from: source.from, to: source.to },
            status: source.status,
        }
        : undefined,
    );
    const result = coreResult(
      await coreRequest(GENERATION_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ data }),
      }),
    );
    return dispatchCreated(result);
  };

  return {
    async generate(value: FeedbackAdminGenerateCommand) {
      const conflicts = await list(value.period);
      const active = conflicts.find(
        (row) =>
          ["queued", "running"].includes(row.status) &&
          row.from === value.period.from &&
          row.to === value.period.to,
      );
      if (active)
        throw new FeedbackAdminCommandError("ACTIVE_RANGE_CONFLICT", 409);
      if (conflicts.length) {
        const details = buildOverlapDetails(
          conflicts.map((row) => ({
            documentId: row.documentId,
            reportRunId: row.reportRunId,
            period: { from: row.from, to: row.to },
            status: row.status,
          })),
          value.period,
        );
        if (
          !value.override.accepted ||
          value.override.overlapDigest !== details.overlapDigest
        )
          throw new FeedbackAdminCommandError(
            "OVERLAP_REQUIRES_OVERRIDE",
            409,
            details,
          );
      }
      const cutoff = new Date();
      return create(value, undefined, cutoff);
    },
    async retry(reportRunId: string, _value: FeedbackAdminRetryCommand) {
      if (!UUID_PATTERN.test(reportRunId))
        throw new FeedbackAdminCommandError("VALIDATION_FAILED", 400);
      const source = await find(reportRunId);
      if (!source || source.status !== "failed")
        throw new FeedbackAdminCommandError("INVALID_STATE", 409);
      const cutoff = new Date();
      const materializedInputs = await materializeGenerationInputs(
        { from: source.from, to: source.to },
        cutoff,
      );
      let data: ReturnType<typeof buildGenerationData>;
      try {
        data = prepareRetryGeneration(
          {
            documentId: source.documentId,
            reportRunId: source.reportRunId,
            period: { from: source.from, to: source.to },
            status: source.status,
          },
          cutoff,
          materializedInputs,
        );
      } catch {
        throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
      }
      const result = coreResult(
        await coreRequest(GENERATION_ENDPOINT, {
          method: "POST",
          body: JSON.stringify({ data }),
        }),
      );
      return dispatchCreated(result);
    },
  };
}

export function getFeedbackAdminCommandTransport(token: string) {
  const baseUrl = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL];
  if (!baseUrl)
    throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
  return createFeedbackAdminCommandTransport({ baseUrl, token });
}
