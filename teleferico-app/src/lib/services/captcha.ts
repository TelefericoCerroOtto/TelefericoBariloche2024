import { assertEnv } from "@/utils/env";
import { ENV_KEYS } from "../constants/env.const";

type ErrorCodes =
  | "missing-input-secret"
  | "invalid-input-secret"
  | "missing-input-response"
  | "invalid-input-response"
  | "bad-request"
  | "timeout-or-duplicate"
  | "connection-failed"; // nuestro código interno para errores de red

type CaptchaResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  "error-codes"?: ErrorCodes[];
};

export async function verifyCaptchaToken(
  token: string,
  remoteIp?: string,
): Promise<CaptchaResponse> {
  assertEnv([ENV_KEYS.RECAPTCHA_SECRET_KEY]);
  const secretKey = process.env[ENV_KEYS.RECAPTCHA_SECRET_KEY] as string;

  const params = new URLSearchParams();
  params.append("secret", secretKey);
  params.append("response", token);
  if (remoteIp) {
    params.append("remoteip", remoteIp);
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const captchaData = (await res.json()) as CaptchaResponse;
    console.log("recaptcha response:", captchaData);
    return captchaData;
  } catch (error) {
    console.error("Error verifying captcha:", error);
    return {
      success: false,
      "error-codes": ["connection-failed"],
    };
  }
}
