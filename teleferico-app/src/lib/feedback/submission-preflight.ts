import type { FeedbackAspectDefinition, ValidatedFeedbackAnswers } from "@/types/api/feedback";
import { ensureTrustedBrowserRequest } from "@/lib/http/guards/browser-request";
import type { NextRequest } from "next/server";
import {
  INTAKE_BODY_LIMIT_BYTES,
  parseSubmissionEnvelope,
  validateIntakePayload,
  validateIntakeRequestHead,
  validateIntakeTransport,
  type SubmissionEnvelope,
} from "./intake-boundary";
import {
  verifyQrSessionBinding,
  verifyQrSessionToken,
  type QrSessionClaims,
  type QrSessionContext,
} from "./qr-session";
import { validateFeedbackAnswers, validateFeedbackAnswerShape } from "./answer-validation";
import { evaluateVersionEligibility } from "./version-eligibility";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._~-]{16,128}$/;
const MINIMUM_FORM_AGE_MILLISECONDS = 3_000;
const MAXIMUM_FORM_AGE_MILLISECONDS = 2 * 60 * 60 * 1_000;

type CaptchaResult = unknown;

export type SubmissionPreflightInput = {
  readonly request: NextRequest;
  readonly body: Uint8Array;
  readonly definitions: readonly FeedbackAspectDefinition[];
  readonly nowEpochSeconds: number;
  readonly signingKey: string | Uint8Array;
  readonly expectedSession: QrSessionContext;
  readonly activeVersionKey: unknown;
  readonly versions: unknown;
  readonly extraAllowedOrigins?: Set<string>;
  readonly verifyCaptcha: (_token: string) => Promise<CaptchaResult>;
};

type PreflightSuccess = {
  readonly trustedOrigin: string;
  readonly idempotencyKey: string;
  readonly envelope: SubmissionEnvelope;
  readonly answers: ValidatedFeedbackAnswers;
  readonly session: QrSessionClaims;
  readonly versionDisposition: "current" | "superseded-grace";
};

type SubmissionIngressSuccess = Pick<PreflightSuccess, "trustedOrigin" | "idempotencyKey" | "envelope">;

type SubmissionIngressInput = Pick<SubmissionPreflightInput,
  "request" | "nowEpochSeconds" | "extraAllowedOrigins" | "verifyCaptcha">;

type SubmissionContextInput = Pick<SubmissionPreflightInput,
  "definitions" | "nowEpochSeconds" | "signingKey" | "expectedSession" | "activeVersionKey" | "versions">;

function validationFailure(fields: readonly string[]) {
  return {
    ok: false as const,
    error: { status: 400 as const, code: "VALIDATION_FAILED" as const, fields },
  };
}

function validateClosedFields(envelope: SubmissionEnvelope) {
  const fields: string[] = [];
  if (typeof envelope.sessionToken !== "string" || envelope.sessionToken.length === 0) {
    fields.push("sessionToken");
  }
  if (
    typeof envelope.idempotencyKey !== "string" ||
    !IDEMPOTENCY_KEY_PATTERN.test(envelope.idempotencyKey)
  ) {
    fields.push("idempotencyKey");
  }
  if (
    typeof envelope.captchaToken !== "string" ||
    envelope.captchaToken.length < 1 ||
    envelope.captchaToken.length > 4_096
  ) {
    fields.push("captchaToken");
  }
  return fields.length === 0 ? null : validationFailure(fields);
}

function validateFormSecurity(
  envelope: SubmissionEnvelope,
  nowEpochSeconds: number,
) {
  if (!Number.isSafeInteger(nowEpochSeconds)) return validationFailure(["formLoadedAt"]);
  if (!Number.isSafeInteger(envelope.formLoadedAt)) {
    return validationFailure(["formLoadedAt"]);
  }

  const age = nowEpochSeconds * 1_000 - Number(envelope.formLoadedAt);
  if (age < MINIMUM_FORM_AGE_MILLISECONDS || age > MAXIMUM_FORM_AGE_MILLISECONDS) {
    return validationFailure(["formLoadedAt"]);
  }
  if (envelope.website !== "") return validationFailure(["website"]);
  return null;
}

async function readBoundedBody(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) return { ok: true as const, value: new Uint8Array() };
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > INTAKE_BODY_LIMIT_BYTES) {
      await reader.cancel();
      return { ok: false as const, error: { status: 413 as const, code: "PAYLOAD_TOO_LARGE" as const } };
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return { ok: true as const, value: body };
}

async function validateSubmissionIngress(input: SubmissionIngressInput & { readonly body: Uint8Array; readonly headValidated?: boolean }) {
  const transportInput = {
    method: input.request.method,
    contentType: input.request.headers.get("content-type"),
    contentLength: input.request.headers.get("content-length"),
    url: input.request.url,
    body: input.body,
  };
  const transport = input.headValidated
    ? validateIntakePayload(input.body, transportInput.contentLength)
    : validateIntakeTransport(transportInput);
  if (!transport.ok) return transport;

  const browserRequest = ensureTrustedBrowserRequest(input.request, input.extraAllowedOrigins);
  if (!browserRequest.ok) return { ok: false as const, error: { status: 403 as const, code: "UNTRUSTED_REQUEST" as const } };

  const parsed = parseSubmissionEnvelope(input.body);
  if (!parsed.ok) return parsed;
  const closedFieldsFailure = validateClosedFields(parsed.value);
  if (closedFieldsFailure) return closedFieldsFailure;
  const answerShape = validateFeedbackAnswerShape(parsed.value);
  if (!answerShape.ok) return answerShape;
  const formSecurityFailure = validateFormSecurity(parsed.value, input.nowEpochSeconds);
  if (formSecurityFailure) return formSecurityFailure;

  try {
    const captcha = await input.verifyCaptcha(parsed.value.captchaToken as string);
    if (typeof captcha !== "object" || captcha === null || !("success" in captcha) || captcha.success !== true) {
      return { ok: false as const, error: { status: 403 as const, code: "CAPTCHA_FAILED" as const } };
    }
  } catch {
    return { ok: false as const, error: { status: 403 as const, code: "CAPTCHA_FAILED" as const } };
  }

  return { ok: true as const, value: {
    trustedOrigin: browserRequest.origin,
    idempotencyKey: parsed.value.idempotencyKey as string,
    envelope: parsed.value,
  } };
}

export async function runSubmissionIngress(input: SubmissionIngressInput) {
  const head = validateIntakeRequestHead({
    method: input.request.method,
    contentType: input.request.headers.get("content-type"),
    contentLength: input.request.headers.get("content-length"),
    url: input.request.url,
  });
  if (!head.ok) return head;
  const body = await readBoundedBody(input.request);
  return body.ok ? validateSubmissionIngress({ ...input, body: body.value, headValidated: true }) : body;
}

export function completeSubmissionPreflight(
  ingress: SubmissionIngressSuccess,
  input: SubmissionContextInput,
  authenticatedSession?: QrSessionClaims,
): { readonly ok: true; readonly value: PreflightSuccess } | { readonly ok: false; readonly error: object } {
  const session = authenticatedSession
    ? verifyQrSessionBinding(authenticatedSession, input.expectedSession)
    : verifyQrSessionToken(ingress.envelope.sessionToken as string, {
        signingKey: input.signingKey, now: input.nowEpochSeconds, expected: input.expectedSession,
      });
  if (!session.ok) return session;
  const eligibility = evaluateVersionEligibility({
    sessionVersionKey: session.value.versionKey, activeVersionKey: input.activeVersionKey,
    nowEpochSeconds: input.nowEpochSeconds, versions: input.versions,
  });
  if (!eligibility.ok) return eligibility;
  const answers = validateFeedbackAnswers(ingress.envelope, input.definitions);
  if (!answers.ok) return answers;
  return { ok: true, value: { ...ingress, answers: answers.value, session: session.value, versionDisposition: eligibility.value.disposition } };
}

export async function runSubmissionPreflight(
  input: SubmissionPreflightInput,
): Promise<{ readonly ok: true; readonly value: PreflightSuccess } | { readonly ok: false; readonly error: object }> {
  const ingress = await validateSubmissionIngress({ ...input, body: input.body });
  return ingress.ok ? completeSubmissionPreflight(ingress.value, input) : ingress;
}
