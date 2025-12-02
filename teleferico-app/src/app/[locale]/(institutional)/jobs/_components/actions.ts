"use server";

import { verifyCaptchaToken } from "@/lib/google/captcha";
import { sendPostulation } from "@/lib/services/postulation";
import {
  FormSubmitServerActionResponse,
  PostulationRequestPayload,
} from "@/types";

export const sendPostulationAction = async (
  token: string | null,
  values: PostulationRequestPayload,
): FormSubmitServerActionResponse => {
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
    const { ok, message, code } = await sendPostulation(values);

    return {
      success: ok,
      message,
      data: { code },
    };
  } catch (error) {
    console.error("sendPostulationAction error: ", error);
    return {
      success: false,
      message: "Postulation action failed",
    };
  }
};
