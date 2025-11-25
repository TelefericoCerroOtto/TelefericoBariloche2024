"use server";

import { sendEmail, verifyCaptchaToken } from "@/lib/services";
import type {
  ContactRequestPayload,
  FormSubmitServerActionResponse,
} from "@/types";

export async function contactUsAction(
  token: string | null,
  values: ContactRequestPayload,
): FormSubmitServerActionResponse {
  if (!token) {
    return {
      success: false,
      message: "Captcha token is missing.",
    };
  }

  const captchaData = await verifyCaptchaToken(token);

  if (!captchaData.success) {
    return {
      success: false,
      message: "Captcha failed. Please try again.",
      data: { code: "CAPTCHA_FAILED" },
    };
  }

  try {
    const { ok, message, code } = await sendEmail(values);

    return {
      success: ok,
      message,
      data: { code },
    };
  } catch (error) {
    console.error("contactUsAction error: ", error);
    return {
      success: false,
      message: "Contact action failed",
    };
  }
}
