import { verifyCaptchaToken } from "@/lib/google/captcha";
import type { FormSubmitServerActionResponse } from "@/types";

type CaptchaErrorCodes = "CAPTCHA_MISSING" | "CAPTCHA_FAILED";

type CaptchaGuardResult =
  | { ok: true }
  | {
      ok: false;
      res: Awaited<FormSubmitServerActionResponse<{ code: CaptchaErrorCodes }>>;
    };

export async function ensureValidCaptcha(
  token: string | null,
): Promise<CaptchaGuardResult> {
  if (!token) {
    return {
      ok: false,
      res: {
        success: false,
        message: "Captcha token is missing.",
        data: { code: "CAPTCHA_MISSING" },
      },
    };
  }

  const captchaData = await verifyCaptchaToken(token);

  if (!captchaData.success) {
    return {
      ok: false,
      res: {
        success: false,
        message: "Captcha failed. Please try again.",
        data: { code: "CAPTCHA_FAILED" },
      },
    };
  }

  return { ok: true };
}
