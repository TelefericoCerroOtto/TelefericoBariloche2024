import { ENV_KEYS } from "@/lib/constants/env.const";
import type { ErrorResponse, FetchResponse } from "@/types";
import { assertEnv } from "@/utils/env";

type Options = {
  errorMsg?: string;
  skipToken?: boolean;
};

function getStrapiURL(endpoint: string, qp?: string) {
  assertEnv([ENV_KEYS.BUILD_STRAPI_BASE_URL]);
  return `${process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL]}${endpoint}${qp ? `?${qp}` : ""}`;
}

export const strapiFetch = async <T>(
  { endpoint, qp }: { endpoint: string; qp?: string },
  init?: RequestInit,
  options?: Options,
): Promise<FetchResponse<T>> => {
  const input = getStrapiURL(endpoint, qp);
  const { errorMsg, skipToken } = options ?? {};

  try {
    const headers = new Headers(init?.headers ?? {});
    if (!skipToken) {
      const auth = headers.get("Authorization");
      if (!auth) {
        assertEnv([ENV_KEYS.BUILD_STRAPI_CONTENT_TOKEN]);
        const token = process.env[
          ENV_KEYS.BUILD_STRAPI_CONTENT_TOKEN
        ] as string;
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const res = await fetch(input, {
      ...init,
      headers,
    });

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
      errorMsg ? errorMsg : `error in strapiFetch while fetching to ${input}: `,
      error,
    );

    return { ok: false, data: null } as { ok: false; data: null };
  }
};
