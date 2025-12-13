import type { ErrorResponse, FetchResponse } from "@/types";

export const strapiFetch = async <T>(
  input: string | URL | globalThis.Request,
  init?: RequestInit,
  errMsg?: string,
): Promise<FetchResponse<T>> => {
  try {
    const res = await fetch(input, init);

    if (res.status === 200 || res.status === 201 || res.status === 204) {
      if (res.status === 204) {
        return { ok: true, data: null as unknown as T };
      }
      const data = (await res.json()) as T;
      return { ok: true, data };
    }

    const text = await res.text();
    const data = text ? (JSON.parse(text) as ErrorResponse) : null;

    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log(
      errMsg ? errMsg : `error in strapiFetch while fetching to ${input}: `,
      error,
    );

    return { ok: false, data: null } as { ok: false; data: null };
  }
};
