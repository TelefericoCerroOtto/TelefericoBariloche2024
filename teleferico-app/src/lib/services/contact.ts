import { ENV_KEYS } from "@/lib/constants/env.const";
import { ROUTE_HANDLERS } from "@/lib/constants/routes.const";
import type { ContactApiResponse, ContactRequestPayload } from "@/types";
import { assertEnv } from "@/utils/env";

const CONTACT_TIMEOUT_MS = 30_000;

export const sendEmail = async (
  payload: ContactRequestPayload,
): Promise<ContactApiResponse> => {
  let res: Response;

  try {
    assertEnv([ENV_KEYS.INTERNAL_API_KEY, ENV_KEYS.NEXT_PUBLIC_BASE_URL]);
    const baseUrl = process.env[ENV_KEYS.NEXT_PUBLIC_BASE_URL];
    const url = `${baseUrl}${ROUTE_HANDLERS.CONTACT}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Origin: baseUrl as string,
      "x-internal-api-key": process.env[ENV_KEYS.INTERNAL_API_KEY] as string,
    };

    if (payload.clientIp && payload.clientIp !== "unknown") {
      headers["x-client-ip"] = payload.clientIp;
    }

    res = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CONTACT_TIMEOUT_MS),
    });

    return await res.json();
  } catch (error) {
    console.log("sendEmail error: ", error);

    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      message: isTimeout ? "Request timed out" : "Network error",
    };
  }
};
