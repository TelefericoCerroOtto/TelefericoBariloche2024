import type { ErrorResponse } from "@/types";

export type FetchResponse<T> =
  | { ok: false; data: ErrorResponse }
  | { ok: true; data: T }
  | { ok: false; data: null };
