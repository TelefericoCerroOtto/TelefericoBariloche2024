export type GuardClientPayload = {
  honeypot: string;
  formLoadedAt: number;
};

export type GuardServerMeta = {
  clientIp: string;
};

export type GuardPayload = GuardClientPayload & GuardServerMeta;

export type PublicFormName = "contact" | "postulation";

export type GuardErrorCodes =
  | "INVALID_FORM_AGE"
  | "TOO_MANY_REQUESTS"
  | "DUPLICATE_SUBMISSION"
  | "FORM_PROTECTION_UNAVAILABLE";

export type FormGuardAction = "allow" | "block" | "error" | "degraded";

export type FormGuardLayer = "ip" | "business";

export type FormGuardBackend = "redis" | "strapi";

export type FormGuardIdentitySource =
  | "x-client-ip"
  | "x-forwarded-for"
  | "x-real-ip"
  | "missing";

export type FormGuardDecisionReason =
  | "allowed"
  | "invalid_internal_api_key"
  | "untrusted_origin"
  | "missing_content_length"
  | "payload_too_large"
  | "unsupported_content_type"
  | "too_many_requests"
  | "invalid_form_age"
  | "honeypot_triggered"
  | "captcha_failed"
  | "rate_limit_degraded"
  | "business_rule_email_limited"
  | "business_rule_duplicate"
  | "business_rule_unavailable"
  | "missing_client_ip"
  | "unexpected_error";

export type FormProtectionRateLimitConfig = {
  enabled: boolean;
  maxHits: number;
  windowMs: number;
};

export type FormProtectionBusinessConfig = {
  enabled: boolean;
  maxHits: number;
  windowMs: number;
};

export type FormProtectionRateLimitPolicy = Record<
  PublicFormName,
  FormProtectionRateLimitConfig
>;

export type FormProtectionBusinessPolicy = Record<
  PublicFormName,
  FormProtectionBusinessConfig
>;

export type FormProtectionRedisConfig = {
  url: string | null;
  namespace: string;
  connectTimeoutMs: number;
  localDevelopmentUrl: string;
};

export type FormGuardEventBase = {
  event: "public_form_guard";
  form: PublicFormName;
  status: number;
  reason: FormGuardDecisionReason;
  layer?: FormGuardLayer;
  backend?: FormGuardBackend;
  identityKey?: string;
  identityHash?: string;
  identitySource?: FormGuardIdentitySource;
  maxHits?: number;
  windowMs?: number;
};

export type FormGuardAllowEvent = FormGuardEventBase & {
  action: "allow";
  reason: "allowed";
};

export type FormGuardBlockEvent = FormGuardEventBase & {
  action: "block";
  reason: Exclude<
    FormGuardDecisionReason,
    "allowed" | "rate_limit_degraded" | "unexpected_error"
  >;
};

export type FormGuardErrorEvent = FormGuardEventBase & {
  action: "error";
  reason: "unexpected_error";
  errorName?: string;
};

export type FormGuardDegradedEvent = FormGuardEventBase & {
  action: "degraded";
  reason:
    | "rate_limit_degraded"
    | "missing_client_ip"
    | "business_rule_unavailable";
};

export type FormGuardEventPayload =
  | FormGuardAllowEvent
  | FormGuardBlockEvent
  | FormGuardErrorEvent
  | FormGuardDegradedEvent;
