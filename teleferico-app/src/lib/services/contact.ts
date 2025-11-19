import type { ContactFormData } from "@/types";
import { ROUTE_HANDLERS } from "@/utils";

type ContactRequestPayload = ContactFormData & {
  submittedAt: number;
  company: string;
  token?: string | null;
};

type ContactApiResponse = {
  ok: boolean;
  message: string;
};

const CONTACT_TIMEOUT_MS = 10_000;

export const sendEmail = async (
  payload: ContactRequestPayload,
): Promise<ContactApiResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false,
      message: "Contact service misconfigured",
    };
  }

  const url = `${baseUrl}${ROUTE_HANDLERS.CONTACT}`;

  let res: Response;
  try {
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
    message: typeof messageFromApi === "string"
      ? messageFromApi
      : ok
        ? "Message sent"
        : "Unexpected response from server",
  };
};
