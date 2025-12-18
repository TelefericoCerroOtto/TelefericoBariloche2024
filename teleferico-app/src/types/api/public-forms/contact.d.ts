import type { ContactFormData, GuardErrorCodes, GuardPayload } from "@/types";

export type ContactRequestPayload = ContactFormData & GuardPayload;

export type ContactApiResponse = {
  ok: boolean;
  message: string;
  code?: GuardErrorCodes;
};
