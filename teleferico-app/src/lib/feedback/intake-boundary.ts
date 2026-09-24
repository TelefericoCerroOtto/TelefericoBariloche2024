export const INTAKE_BODY_LIMIT_BYTES = 32 * 1024;

const PUBLIC_CODE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const DRAFT_IDENTIFIER_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const REQUIRED_SUBMISSION_FIELDS = [
  "contractVersion",
  "sessionToken",
  "idempotencyKey",
  "locale",
  "overallRating",
  "aspects",
  "formLoadedAt",
  "website",
  "captchaToken",
] as const;

const OPTIONAL_SUBMISSION_FIELDS = ["otherAspect", "comment"] as const;
const SUBMISSION_FIELDS = new Set<string>([
  ...REQUIRED_SUBMISSION_FIELDS,
  ...OPTIONAL_SUBMISSION_FIELDS,
]);

export type IntakeBoundaryErrorCode =
  | "INVALID_PATH_IDENTIFIER"
  | "METHOD_NOT_ALLOWED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_FAILED";

export type IntakeBoundaryError = {
  readonly status: 400 | 405 | 413 | 415;
  readonly code: IntakeBoundaryErrorCode;
  readonly field?: "publicCode" | "draftId";
  readonly fields?: readonly string[];
};

export type BoundaryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: IntakeBoundaryError };

export type SubmissionEnvelope = {
  readonly contractVersion: "feedback-public.v1";
  readonly sessionToken: unknown;
  readonly idempotencyKey: unknown;
  readonly locale: unknown;
  readonly overallRating: unknown;
  readonly aspects: unknown;
  readonly otherAspect?: unknown;
  readonly comment?: unknown;
  readonly formLoadedAt: unknown;
  readonly website: unknown;
  readonly captchaToken: unknown;
};

export type IntakeEnvelopeInput = {
  readonly method: string;
  readonly contentType: string | null;
  readonly contentLength?: string | null;
  readonly url: string;
  readonly body: Uint8Array;
};

type IntakeHeadInput = Omit<IntakeEnvelopeInput, "body">;

function invalidPath(field: "publicCode" | "draftId"): BoundaryResult<never> {
  return {
    ok: false,
    error: { status: 400, code: "INVALID_PATH_IDENTIFIER", field },
  };
}

function validatePathIdentifier(
  value: string,
  pattern: RegExp,
  field: "publicCode" | "draftId",
): BoundaryResult<string> {
  return pattern.test(value) ? { ok: true, value } : invalidPath(field);
}

export function validatePublicCode(value: string): BoundaryResult<string> {
  return validatePathIdentifier(value, PUBLIC_CODE_PATTERN, "publicCode");
}

export function validateDraftIdentifier(value: string): BoundaryResult<string> {
  return validatePathIdentifier(value, DRAFT_IDENTIFIER_PATTERN, "draftId");
}

function failure(
  status: IntakeBoundaryError["status"],
  code: IntakeBoundaryErrorCode,
  fields?: readonly string[],
): BoundaryResult<never> {
  return {
    ok: false,
    error: fields ? { status, code, fields } : { status, code },
  };
}

function isUtf8Json(contentType: string | null): boolean {
  if (contentType === null) return false;

  const parts = contentType
    .toLowerCase()
    .split(";")
    .map((part) => part.trim());

  return (
    parts[0] === "application/json" &&
    (parts.length === 1 ||
      (parts.length === 2 && parts[1] === "charset=utf-8"))
  );
}

function validateDeclaredLength(
  value: string | null | undefined,
  actualLength: number,
): BoundaryResult<null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    return failure(400, "VALIDATION_FAILED", ["content-length"]);
  }

  const declaredLength = Number(value);
  if (!Number.isSafeInteger(declaredLength) || declaredLength !== actualLength) {
    return failure(400, "VALIDATION_FAILED", ["content-length"]);
  }
  if (declaredLength > INTAKE_BODY_LIMIT_BYTES) {
    return failure(413, "PAYLOAD_TOO_LARGE");
  }

  return { ok: true, value: null };
}

function parseBody(body: Uint8Array): BoundaryResult<Record<string, unknown>> {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(body);
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return failure(400, "VALIDATION_FAILED", ["body"]);
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return failure(400, "VALIDATION_FAILED", ["body"]);
  }
}

function validateFields(body: Record<string, unknown>): BoundaryResult<SubmissionEnvelope> {
  const invalidFields = [
    ...REQUIRED_SUBMISSION_FIELDS.filter((field) => !(field in body)),
    ...Object.keys(body).filter((field) => !SUBMISSION_FIELDS.has(field)),
  ];

  if (body.contractVersion !== "feedback-public.v1") {
    invalidFields.push("contractVersion");
  }
  if (invalidFields.length > 0) {
    return failure(400, "VALIDATION_FAILED", [...new Set(invalidFields)].sort());
  }

  return { ok: true, value: body as SubmissionEnvelope };
}

export function validateIntakeTransport(
  input: IntakeEnvelopeInput,
): BoundaryResult<null> {
  const head = validateIntakeRequestHead(input);
  if (!head.ok) return head;
  return validateIntakePayload(input.body, input.contentLength);
}

export function validateIntakeRequestHead(input: IntakeHeadInput): BoundaryResult<null> {
  if (input.method !== "POST") return failure(405, "METHOD_NOT_ALLOWED");
  if (!isUtf8Json(input.contentType)) {
    return failure(415, "UNSUPPORTED_MEDIA_TYPE");
  }

  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return failure(400, "VALIDATION_FAILED", ["url"]);
  }
  if (url.search.length > 0) {
    return failure(400, "VALIDATION_FAILED", ["query"]);
  }
  const declared = input.contentLength;
  if (declared && /^(0|[1-9][0-9]*)$/.test(declared) && Number(declared) > INTAKE_BODY_LIMIT_BYTES) {
    return failure(413, "PAYLOAD_TOO_LARGE");
  }

  return { ok: true, value: null };
}

export function validateIntakePayload(body: Uint8Array, contentLength?: string | null): BoundaryResult<null> {
  if (body.byteLength > INTAKE_BODY_LIMIT_BYTES) return failure(413, "PAYLOAD_TOO_LARGE");
  const lengthResult = validateDeclaredLength(contentLength, body.byteLength);
  if (!lengthResult.ok) return lengthResult;

  return { ok: true, value: null };
}

export function parseSubmissionEnvelope(
  body: Uint8Array,
): BoundaryResult<SubmissionEnvelope> {
  const bodyResult = parseBody(body);
  if (!bodyResult.ok) return bodyResult;

  return validateFields(bodyResult.value);
}

export function validateIntakeEnvelope(
  input: IntakeEnvelopeInput,
): BoundaryResult<SubmissionEnvelope> {
  const transportResult = validateIntakeTransport(input);
  if (!transportResult.ok) return transportResult;

  return parseSubmissionEnvelope(input.body);
}
