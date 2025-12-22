export type GuardClientPayload = {
  honeypot: string;
  formLoadedAt: number;
};

export type GuardServerMeta = {
  clientIp: string;
};

export type GuardPayload = GuardClientPayload & GuardServerMeta;

export type GuardErrorCodes = "INVALID_FORM_AGE" | "TOO_MANY_REQUESTS";
