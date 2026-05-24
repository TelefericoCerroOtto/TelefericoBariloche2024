import type {
  FormGuardAction,
  FormGuardBackend,
  FormGuardDecisionReason,
  FormGuardEventPayload,
  FormGuardIdentitySource,
  FormGuardLayer,
  PublicFormName,
} from "@/types";
import { createHash } from "crypto";

type EmitFormGuardEventInput = {
  action: FormGuardAction;
  form: PublicFormName;
  status: number;
  reason: FormGuardDecisionReason;
  backend?: FormGuardBackend;
  identityKey?: string;
  identitySource?: FormGuardIdentitySource;
  layer?: FormGuardLayer;
  maxHits?: number;
  windowMs?: number;
  error?: unknown;
};

function hashIdentity(identityKey: string | undefined): string | undefined {
  if (!identityKey) return undefined;

  return createHash("sha256").update(identityKey).digest("hex");
}

function toEventPayload(
  input: EmitFormGuardEventInput,
): FormGuardEventPayload {
  const baseEvent = {
    event: "public_form_guard" as const,
    action: input.action,
    backend: input.backend,
    form: input.form,
    layer: input.layer,
    status: input.status,
    reason: input.reason,
    identityHash: hashIdentity(input.identityKey),
    identitySource: input.identitySource,
    maxHits: input.maxHits,
    windowMs: input.windowMs,
  };

  if (input.action === "error") {
    return {
      ...baseEvent,
      action: "error",
      reason: "unexpected_error",
      errorName: input.error instanceof Error ? input.error.name : undefined,
    };
  }

  if (input.action === "allow") {
    return {
      ...baseEvent,
      action: "allow",
      reason: "allowed",
    };
  }

  if (input.action === "degraded") {
    return {
      ...baseEvent,
      action: "degraded",
      reason:
        input.reason === "missing_client_ip"
          ? "missing_client_ip"
          : input.reason === "business_rule_unavailable"
            ? "business_rule_unavailable"
          : "rate_limit_degraded",
    };
  }

  return {
    ...baseEvent,
    action: "block",
      reason: input.reason as Exclude<
        FormGuardDecisionReason,
        | "allowed"
        | "rate_limit_degraded"
        | "missing_client_ip"
        | "business_rule_unavailable"
        | "unexpected_error"
      >,
    };
}

function cleanUndefined<T extends Record<string, unknown>>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as T;
}

export function emitFormGuardEvent(input: EmitFormGuardEventInput): void {
  const event = cleanUndefined(toEventPayload(input));
  const serializedEvent = JSON.stringify(event);

  if (input.action === "degraded" || input.action === "error") {
    console.error(serializedEvent);
    return;
  }

  if (input.action === "block") {
    console.warn(serializedEvent);
    return;
  }

  console.log(serializedEvent);
}
