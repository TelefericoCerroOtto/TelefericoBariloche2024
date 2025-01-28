export type FetchResponse<T> =
  | { ok: false; data: null | ErrorResponse }
  | { ok: true; data: T };
