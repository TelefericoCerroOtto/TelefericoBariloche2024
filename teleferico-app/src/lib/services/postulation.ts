import { sendPostulationAdapter } from "@/lib/adapters";
import { ENV_KEYS } from "@/lib/constants/env.const";
import type {
  PostulationApiResponse,
  PostulationRequestPayload,
} from "@/types";
import { ROUTE_HANDLERS } from "@/utils";
import { assertEnv } from "@/utils/env";

const POSTULATION_TIMEOUT_MS = 30_000;

export const sendPostulation = async (
  values: PostulationRequestPayload,
): Promise<PostulationApiResponse> => {
  try {
    assertEnv([ENV_KEYS.INTERNAL_API_KEY, ENV_KEYS.NEXT_PUBLIC_BASE_URL]);

    const baseUrl = process.env[ENV_KEYS.NEXT_PUBLIC_BASE_URL];
    const url = `${baseUrl}${ROUTE_HANDLERS.POSTUALTION}`;

    if (!values.resume) {
      throw new Error("sendPostulation: resume is missing or invalid");
    }

    const formData = sendPostulationAdapter(values);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Origin: baseUrl as string,
        "x-internal-api-key": process.env[ENV_KEYS.INTERNAL_API_KEY] as string,
      },
      cache: "no-store",
      body: formData,
      signal: AbortSignal.timeout(POSTULATION_TIMEOUT_MS),
    });

    console.log("postulation route handler response: ", res);

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
