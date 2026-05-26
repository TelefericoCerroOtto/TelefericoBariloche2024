import "server-only";

import { sendPostulationAdapter } from "@/lib/adapters";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { ROUTE_HANDLERS } from "@/lib/constants/routes.const";
import type {
  PostulationApiResponse,
  PostulationRequestPayload,
} from "@/types";
import { assertEnv } from "@/utils/env";

const POSTULATION_TIMEOUT_MS = 30_000;

export const sendPostulation = async (
  values: PostulationRequestPayload,
): Promise<PostulationApiResponse> => {
  try {
    assertEnv([
      ENV_KEYS.INTERNAL_API_KEY,
      ENV_KEYS.APP_INTERNAL_BASE_URL,
      ENV_KEYS.NEXT_PUBLIC_SITE_URL,
    ]);

    const internalBaseUrl = process.env[ENV_KEYS.APP_INTERNAL_BASE_URL];
    const publicSiteUrl = process.env[ENV_KEYS.NEXT_PUBLIC_SITE_URL];
    const url = `${internalBaseUrl}${ROUTE_HANDLERS.POSTUALTION}`;

    if (!values.resume) {
      throw new Error("sendPostulation: resume is missing or invalid");
    }

    const formData = sendPostulationAdapter(values);

    const headers: HeadersInit = {
      Origin: publicSiteUrl as string,
      "x-internal-api-key": process.env[ENV_KEYS.INTERNAL_API_KEY] as string,
    };

    if (values.clientIp && values.clientIp !== "unknown") {
      headers["x-client-ip"] = values.clientIp;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      body: formData,
      signal: AbortSignal.timeout(POSTULATION_TIMEOUT_MS),
    });

    return await res.json();
  } catch (error) {
    console.log("sendPostulation error: ", error);

    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      message: isTimeout ? "Request timed out" : "Network error",
    };
  }
};
