import type { ErrorResponse, FetchResponse } from "@/types";

export const fetchWrapper = async <T>(
  input: string | URL | globalThis.Request,
  init?: RequestInit,
  errMsg?: string,
): Promise<FetchResponse<T>> => {
  try {
    const res = await fetch(input, init);

    if (res.status === 200 || res.status === 201) {
      const data = (await res.json()) as T;
      return { ok: true, data };
    }

    const data = (await res.json()) as ErrorResponse;
    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log(errMsg, error);
    return { ok: false, data: null } as { ok: false; data: null };
  }
};
