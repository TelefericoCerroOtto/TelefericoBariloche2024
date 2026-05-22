import "server-only";

import { createHash } from "crypto";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { emitFormGuardEvent } from "@/lib/http/guards/form-guard-events";
import { getFormBusinessPolicy } from "@/lib/http/guards/form-protection-policy";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  FetchResponse,
  GetFormProtectionSubmissionsResponse,
  GuardErrorCodes,
  PostFormProtectionSubmissionRequest,
  PostFormProtectionSubmissionResponse,
  PublicFormName,
} from "@/types";
import { assertEnv } from "@/utils/env";
import { stringifyQuery } from "@/utils/query";

type FormProtectionSignal = {
  fingerprintHash: string;
  fingerprintVersion: "v1";
};

// In the current postulation flow, the selected sector document id is the
// business identifier used to detect duplicate postulations for the same role.
type PostulationDuplicateKey = string;

type EvaluateFormBusinessRulesInput = {
  email: string;
  form: PublicFormName;
  metadata?: Record<string, unknown>;
  positionKey?: string | null;
  sectorDocumentId?: PostulationDuplicateKey | null;
  signal: FormProtectionSignal;
};

type FormBusinessRuleOutcome =
  | {
      ok: true;
      allowed: true;
      code?: undefined;
      message?: undefined;
    }
  | {
      ok: true;
      allowed: false;
      code: GuardErrorCodes;
      message: string;
    }
  | {
      ok: false;
      allowed: false;
      code: "FORM_PROTECTION_UNAVAILABLE";
      message: string;
    };

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildFormProtectionSignal(input: {
  email: string;
  form: PublicFormName;
  origin?: string | null;
  positionKey?: string | null;
  sectorDocumentId?: string | null;
  userAgent?: string | null;
}): FormProtectionSignal {
  const normalizedEmail = normalizeEmail(input.email);
  const fingerprintSource = [
    input.form,
    normalizedEmail,
    input.positionKey ?? "",
    input.sectorDocumentId ?? "",
    input.origin ?? "",
    input.userAgent ?? "",
  ].join("|");

  return {
    fingerprintHash: sha256(fingerprintSource),
    fingerprintVersion: "v1",
  };
}

function buildSafeFailureMessage(form: PublicFormName): string {
  return form === "contact"
    ? "Could not verify your message right now"
    : "Could not verify your postulation right now";
}

function hasMatchingPostulationDuplicate(
  records: GetFormProtectionSubmissionsResponse["data"],
  duplicateKey: PostulationDuplicateKey | null | undefined,
): boolean {
  return !!duplicateKey && records.some((record) => record.sectorDocumentId === duplicateKey);
}

async function listRecentBusinessRecords(
  token: string,
  input: EvaluateFormBusinessRulesInput,
): Promise<FetchResponse<GetFormProtectionSubmissionsResponse>> {
  const policy = getFormBusinessPolicy(input.form);
  const normalizedEmailHash = sha256(normalizeEmail(input.email));
  const since = new Date(Date.now() - policy.windowMs).toISOString();

  const query = {
    filters: {
      form: { $eq: input.form },
      normalizedEmailHash: { $eq: normalizedEmailHash },
      decision: { $eq: "allowed" },
      createdAt: { $gte: since },
    },
    pagination: { page: 1, pageSize: Math.max(policy.maxHits + 5, 10) },
    sort: ["createdAt:desc"],
  };

  return await strapiFetch<GetFormProtectionSubmissionsResponse>(
    {
      endpoint: STRAPI_ENDPOINTS.FORM_PROTECTION_SUBMISSIONS,
      qp: stringifyQuery(query),
    },
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
    {
      errorMsg: `Failed to query form protection records for ${input.form}`,
      skipToken: true,
    },
  );
}

async function createBusinessRecord(
  token: string,
  body: PostFormProtectionSubmissionRequest,
): Promise<FetchResponse<PostFormProtectionSubmissionResponse>> {
  return await strapiFetch<PostFormProtectionSubmissionResponse>(
    { endpoint: STRAPI_ENDPOINTS.FORM_PROTECTION_SUBMISSIONS },
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    },
    {
      errorMsg: "Failed to create form protection record",
      skipToken: true,
    },
  );
}

export async function evaluateFormBusinessRules(
  input: EvaluateFormBusinessRulesInput,
): Promise<FormBusinessRuleOutcome> {
  assertEnv([ENV_KEYS.STRAPI_FORMS_TOKEN]);
  const token = process.env[ENV_KEYS.STRAPI_FORMS_TOKEN] as string;
  const normalizedEmailHash = sha256(normalizeEmail(input.email));
  const policy = getFormBusinessPolicy(input.form);

  if (!policy.enabled) {
    return { ok: true, allowed: true };
  }

  const records = await listRecentBusinessRecords(token, input);
  if (!records.ok) {
    emitFormGuardEvent({
      action: "degraded",
      backend: "strapi",
      form: input.form,
      layer: "business",
      status: 503,
      reason: "business_rule_unavailable",
      identityKey: normalizedEmailHash,
      maxHits: policy.maxHits,
      windowMs: policy.windowMs,
    });

    return {
      ok: false,
      allowed: false,
      code: "FORM_PROTECTION_UNAVAILABLE",
      message: buildSafeFailureMessage(input.form),
    };
  }

  const duplicateMarker =
    input.form === "postulation" &&
    hasMatchingPostulationDuplicate(records.data.data, input.sectorDocumentId);
  const emailLimitExceeded = records.data.data.length >= policy.maxHits;

  const decision = duplicateMarker
    ? "blocked_duplicate"
    : emailLimitExceeded
      ? "blocked_email_limit"
      : "allowed";

  const recordPayload: PostFormProtectionSubmissionRequest = {
    data: {
      form: input.form,
      normalizedEmailHash,
      sectorDocumentId: input.sectorDocumentId ?? null,
      positionKey: input.positionKey ?? null,
      decision,
      duplicateMarker,
      reviewStatus: "clean",
      banned: false,
      threshold: policy.maxHits,
      windowMs: policy.windowMs,
      submittedAt: new Date().toISOString(),
      metadata: input.metadata ?? null,
      fingerprint: {
        version: input.signal.fingerprintVersion,
      },
      signal: {
        fingerprintHash: input.signal.fingerprintHash,
      },
    },
  };

  const persisted = await createBusinessRecord(token, recordPayload);
  if (!persisted.ok) {
    emitFormGuardEvent({
      action: "degraded",
      backend: "strapi",
      form: input.form,
      layer: "business",
      status: 503,
      reason: "business_rule_unavailable",
      identityKey: normalizedEmailHash,
      maxHits: policy.maxHits,
      windowMs: policy.windowMs,
    });

    return {
      ok: false,
      allowed: false,
      code: "FORM_PROTECTION_UNAVAILABLE",
      message: buildSafeFailureMessage(input.form),
    };
  }

  if (duplicateMarker) {
    return {
      ok: true,
      allowed: false,
      code: "DUPLICATE_SUBMISSION",
      message: "A submission for this sector already exists",
    };
  }

  if (emailLimitExceeded) {
    return {
      ok: true,
      allowed: false,
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests",
    };
  }

  return { ok: true, allowed: true };
}
