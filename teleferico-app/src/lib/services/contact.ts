import type { ContactApiResponse, ContactRequestPayload } from "@/types";
import { ROUTE_HANDLERS } from "@/utils";
import { assertEnv } from "@/utils/env";
import { ENV_KEYS } from "../constants/env.const";

const CONTACT_TIMEOUT_MS = 10_000;

export const sendEmail = async (
  payload: ContactRequestPayload,
): Promise<ContactApiResponse> => {
  let res: Response;

  try {
    assertEnv([ENV_KEYS.NEXT_PUBLIC_BASE_URL]);
    const baseUrl = process.env[ENV_KEYS.NEXT_PUBLIC_BASE_URL];
    const url = `${baseUrl}${ROUTE_HANDLERS.CONTACT}`;

    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CONTACT_TIMEOUT_MS),
    });
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

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const ok = (data as { ok?: boolean })?.ok ?? res.ok;
  const messageFromApi = (data as { message?: string })?.message;

  return {
    ok,
    message:
      typeof messageFromApi === "string"
        ? messageFromApi
        : ok
          ? "Message sent"
          : "Unexpected response from server",
  };
};
