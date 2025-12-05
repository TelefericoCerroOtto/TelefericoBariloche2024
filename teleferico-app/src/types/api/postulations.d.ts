import type {
  GuardErrorCodes,
  GuardPayload,
  PostulationFormData,
} from "@/types";

export type PostulationRequestPayload = PostulationFormData & GuardPayload;

export type PostulationApiResponse = {
  ok: boolean;
  message: string;
  code?: GuardErrorCodes;
};
