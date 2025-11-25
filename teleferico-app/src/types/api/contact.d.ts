import type { ContactFormData } from "@/types";

export type ContactRequestPayload = ContactFormData & {
  honeypot: string;
  formLoadedAt: number;
};

export type ContactApiResponse = {
  ok: boolean;
  message: string;
  code?: "INVALID_FORM_AGE";
};
