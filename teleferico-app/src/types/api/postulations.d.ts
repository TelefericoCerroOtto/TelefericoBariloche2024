import type { PostulationFormData } from "@/types";

export type PostulationRequestPayload = PostulationFormData & {
  honeypot: string;
  formLoadedAt: number;
};

export type PostulationApiResponse = {
  ok: boolean;
  message: string;
  code?: "INVALID_FORM_AGE";
};
